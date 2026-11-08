import { ObjectId } from "mongodb";
import { AppDocSchema, type AppDoc } from "@/lib/types";
import { AiError, editApp, generateApp, pickModel } from "@/lib/server/ai";
import { envOf, projects } from "@/lib/server/projects";
import { requireProject } from "@/lib/server/access";
import { actor, audit } from "@/lib/server/audit";
import { emptyUsage, recordPrompt, type Usage } from "@/lib/server/usage";
import { fail, handle, ok } from "@/lib/server/http";
import { db } from "@/lib/server/db";

/**
 * AI calls take 30-90+ s, longer than the hosting proxy's request limit (100 s). So this endpoint only starts a
 * job and answers at once with { jobId }; the work continues in this process and the client polls
 * GET /api/projects/:id/ai/:jobId (see ai/[job]/route.ts and runAi() in lib/client.ts).
 */
export async function POST(req: Request, ctx: RouteContext<"/api/projects/[id]/ai">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { project: p, user, perms } = await requireProject(id, "update");
    const body = await req.json();
    const prompt = String(body.prompt || "").trim();
    if (!prompt) return fail("Prompt bo'sh");

    const kind: "generate" | "edit" = body.mode === "generate" ? "generate" : "edit";
    const nodeId = kind === "edit" && typeof body.nodeId === "string" ? body.nodeId : null;

    // edit: the client sends its current doc (may contain unsaved manual edits)
    let editDoc: AppDoc | null = null;
    if (kind === "edit") {
      const parsed = AppDocSchema.safeParse(body.doc ?? p.doc);
      if (!parsed.success) {
        const i = parsed.error.issues[0];
        return fail(`Hujjat noto'g'ri: ${i?.path.join(".")} (${i?.message})`);
      }
      editDoc = parsed.data;
    }

    const jobs = (await db()).collection("ai_jobs");
    await jobs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 });
    const jobId = new ObjectId();
    await jobs.insertOne({ _id: jobId, projectId: id, userId: user.id, status: "running", createdAt: new Date() });

    const started = Date.now();
    // Every request lands in the prompt history: who asked what, the model, tokens, time and outcome.
    const record = (status: "ok" | "error", usage: Usage, extra: { message?: string; opsCount?: number; error?: string }) =>
      recordPrompt({
        userId: user.id,
        userEmail: user.email,
        projectId: id,
        kind,
        prompt,
        nodeId,
        usage,
        durationMs: Date.now() - started,
        status,
        ...extra,
      });

    const work = async (): Promise<Record<string, unknown>> => {
      try {
        if (kind === "generate") {
          const env = envOf(p);
          const hints = [
            env.BOT_TOKEN && "Telegram bot",
            env.CLICK_SERVICE_ID && "Click payments",
            env.PAYME_MERCHANT_ID && "Payme payments",
          ].filter(Boolean) as string[];
          const { doc, usage } = await generateApp(prompt, hints, p.name, p.aiModel);
          const message = `Ilova tayyor: ${doc.screens.length} ta ekran`;
          await (await projects()).updateOne({ _id: p._id }, { $set: { doc, updatedAt: new Date() } });
          await record("ok", usage, { message, opsCount: doc.screens.length });
          if (perms.viaAdmin) await audit({ ...actor(user, true), action: "ai.generate", projectId: id });
          return { doc, message };
        }
        const { usage, ...res } = await editApp(editDoc!, prompt, nodeId, p.aiModel);
        await (await projects()).updateOne({ _id: p._id }, { $set: { doc: res.doc, updatedAt: new Date() } });
        await record("ok", usage, { message: res.message, opsCount: res.ops.length });
        if (perms.viaAdmin) await audit({ ...actor(user, true), action: "ai.edit", projectId: id });
        return res;
      } catch (e) {
        const usage = e instanceof AiError ? e.usage : emptyUsage(pickModel(p.aiModel), false);
        await record("error", usage, { error: (e as Error).message }).catch((re) => console.error("prompt record", re));
        throw e;
      }
    };

    // Not awaited on purpose: the response below returns immediately and the job finishes in the background.
    void work()
      .then((result) => jobs.updateOne({ _id: jobId }, { $set: { status: "done", result, finishedAt: new Date() } }))
      .catch(async (e) => {
        console.error("ai job", e);
        await jobs
          .updateOne({ _id: jobId }, { $set: { status: "error", error: (e as Error).message || "AI xatosi", finishedAt: new Date() } })
          .catch(() => {});
      });

    return ok({ jobId: String(jobId) }, 202);
  });
}
