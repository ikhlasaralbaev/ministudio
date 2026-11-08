import "server-only";
import { ObjectId, type WithId } from "mongodb";
import { AppDocSchema, type AppDoc } from "../types";
import type { Perms } from "../permissions";
import { AiError, editApp, generateApp, pickModel } from "./ai";
import { actor, audit } from "./audit";
import { db } from "./db";
import { HttpError } from "./http";
import { envOf, projects, type ProjectRow } from "./projects";
import { emptyUsage, recordPrompt, type Usage } from "./usage";
import { isTelegramOnly } from "./tglink";
import type { SessionUser } from "./access";

export type AiOutcome = { ok: true; result: Record<string, unknown> } | { ok: false; error: string };

/**
 * Starts an AI request (generate the whole app, or edit it) as a background job and returns at once.
 * `done` settles when the job finishes; callers that need the result (Telegram chat) await it, the web API just polls the job.
 */
export async function startAiJob(o: {
  project: WithId<ProjectRow>;
  user: SessionUser;
  perms: Perms;
  kind: "generate" | "edit";
  prompt: string;
  nodeId?: string | null;
  /** edit: the caller's current doc (may contain unsaved edits); defaults to the stored draft. */
  doc?: unknown;
}): Promise<{ jobId: string; done: Promise<AiOutcome> }> {
  const { project: p, user, perms, kind, prompt } = o;
  const id = p._id.toHexString();
  const nodeId = kind === "edit" && typeof o.nodeId === "string" ? o.nodeId : null;

  let editDoc: AppDoc | null = null;
  if (kind === "edit") {
    const parsed = AppDocSchema.safeParse(o.doc ?? p.doc);
    if (!parsed.success) {
      const i = parsed.error.issues[0];
      throw new HttpError(`Hujjat noto'g'ri: ${i?.path.join(".")} (${i?.message})`, 400);
    }
    editDoc = parsed.data;
  }

  // Accounts created from Telegram alone get a daily cap on AI requests (until real plans exist).
  if (isTelegramOnly(user.email)) {
    const limit = Number(process.env.TG_AI_DAILY_LIMIT) || 20;
    const used = await (await db()).collection("usage").countDocuments({ userId: user.id, mock: { $ne: true }, at: { $gt: new Date(Date.now() - 86_400_000) } });
    if (used >= limit) throw new HttpError("Kunlik AI limiti tugadi. Ertaga urinib ko'ring.", 429);
  }

  const jobs = (await db()).collection("ai_jobs");
  await jobs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 });
  const jobId = new ObjectId();
  await jobs.insertOne({ _id: jobId, projectId: id, userId: user.id, status: "running", createdAt: new Date() });

  const started = Date.now();
  // Every request lands in the prompt history: who asked what, the model, tokens, time and outcome.
  const record = (status: "ok" | "error", usage: Usage, extra: { message?: string; opsCount?: number; error?: string }) =>
    recordPrompt({ userId: user.id, userEmail: user.email, projectId: id, kind, prompt, nodeId, usage, durationMs: Date.now() - started, status, ...extra });

  const work = async (): Promise<Record<string, unknown>> => {
    try {
      if (kind === "generate") {
        const env = envOf(p);
        const hints = [env.BOT_TOKEN && "Telegram bot", env.CLICK_SERVICE_ID && "Click payments", env.PAYME_MERCHANT_ID && "Payme payments"].filter(Boolean) as string[];
        // a project named from the idea lets the AI pick the real name
        const { doc, usage } = await generateApp(prompt, hints, p.autoName ? "" : p.name, p.aiModel);
        const message = `Ilova tayyor: ${doc.screens.length} ta ekran`;
        await (await projects()).updateOne(
          { _id: p._id },
          { $set: { doc, updatedAt: new Date(), ...(p.autoName && doc.name ? { name: doc.name.slice(0, 80) } : {}) }, ...(p.autoName ? { $unset: { autoName: "" } } : {}) },
        );
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

  // Not awaited: the caller gets the job id immediately and the job finishes in the background.
  const done: Promise<AiOutcome> = work().then(
    async (result) => {
      await jobs.updateOne({ _id: jobId }, { $set: { status: "done", result, finishedAt: new Date() } }).catch(() => {});
      return { ok: true as const, result };
    },
    async (e) => {
      console.error("ai job", e);
      const error = (e as Error).message || "AI xatosi";
      await jobs.updateOne({ _id: jobId }, { $set: { status: "error", error, finishedAt: new Date() } }).catch(() => {});
      return { ok: false as const, error };
    },
  );
  return { jobId: String(jobId), done };
}
