import "server-only";
import { ObjectId, type WithId } from "mongodb";
import { AppDocSchema, type AppDoc } from "../types";
import type { Perms } from "../permissions";
import { AiError, editApp, generateApp, pickModel } from "./ai";
import { aiImages, logoInfo } from "./assets";
import { actor, audit } from "./audit";
import { db } from "./db";
import { HttpError } from "./http";
import { envOf, projects, type ProjectRow } from "./projects";
import { emptyUsage, recordPrompt, type Usage } from "./usage";
import { notifyJobDone, shouldNotify } from "./notify";
import { chargeUsage, requireCredits } from "./credits";
import { rateLimited } from "./runtime";
import { isPlatformAdmin, type SessionUser } from "./access";

const MAX_AI_PER_WINDOW = 12;
const MAX_RUNNING_JOBS = 2;

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
  /** Reference image asset ids of this project to show the model (max 5). */
  refs?: string[];
  /** Announce the result in Telegram when it took long and no open page is watching (the web API sets it; the bot chat reports itself). */
  notify?: boolean;
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

  // Credits: nothing left, no new request (platform admins are not metered).
  const metered = !isPlatformAdmin(user.email);
  if (metered) await requireCredits(user.id);

  // Abuse guards (platform admins excluded): a burst limit, and at most 2 jobs running at once, which also stops
  // parallel requests from all passing the balance check before any of them is charged.
  const jobs = (await db()).collection("ai_jobs");
  if (metered) {
    if (rateLimited(`ai:${user.id}`, MAX_AI_PER_WINDOW, 10 * 60_000)) throw new HttpError("Juda ko'p so'rov yubordingiz. Birozdan keyin qayta urinib ko'ring.", 429);
    const running = await jobs.countDocuments({ userId: user.id, status: "running", createdAt: { $gt: new Date(Date.now() - 10 * 60_000) } });
    if (running >= MAX_RUNNING_JOBS) throw new HttpError("Avvalgi so'rovlaringiz tugashini kuting.", 429);
  }

  // attachments: references (images) and the logo (a text note), both only from THIS project
  const extras = { images: await aiImages(id, o.refs), logo: await logoInfo(id, p.logoAssetId) };

  await jobs.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 });
  const jobId = new ObjectId();
  await jobs.insertOne({ _id: jobId, projectId: id, userId: user.id, status: "running", kind, createdAt: new Date() });

  const started = Date.now();
  // Every request lands in the prompt history: who asked what, the model, tokens, time and outcome.
  const record = async (status: "ok" | "error", usage: Usage, extra: { message?: string; opsCount?: number; error?: string }) => {
    await recordPrompt({ userId: user.id, userEmail: user.email, projectId: id, kind, prompt, nodeId, usage, durationMs: Date.now() - started, status, ...extra });
    if (metered) await chargeUsage(user.id, usage, String(jobId)).catch((e) => console.error("charge", e));
  };

  const work = async (): Promise<Record<string, unknown>> => {
    try {
      if (kind === "generate") {
        const env = envOf(p);
        const hints = [env.BOT_TOKEN && "Telegram bot", env.CLICK_SERVICE_ID && "Click payments", env.PAYME_MERCHANT_ID && "Payme payments"].filter(Boolean) as string[];
        // a project named from the idea lets the AI pick the real name
        const { doc, usage } = await generateApp(prompt, hints, p.autoName ? "" : p.name, p.aiModel, extras);
        const message = `Ilova tayyor: ${doc.screens.length} ta ekran`;
        await (await projects()).updateOne(
          { _id: p._id },
          { $set: { doc, updatedAt: new Date(), ...(p.autoName && doc.name ? { name: doc.name.slice(0, 80) } : {}) }, ...(p.autoName ? { $unset: { autoName: "" } } : {}) },
        );
        await record("ok", usage, { message, opsCount: doc.screens.length });
        if (perms.viaAdmin) await audit({ ...actor(user, true), action: "ai.generate", projectId: id });
        return { doc, message };
      }
      const { usage, ...res } = await editApp(editDoc!, prompt, nodeId, p.aiModel, extras);
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

  const announce = async (ok: boolean) => {
    if (!o.notify) return;
    const seen = (await jobs.findOne({ _id: jobId }).catch(() => null))?.seen;
    if (!shouldNotify({ durationMs: Date.now() - started, seen })) return;
    const name = ((await (await projects()).findOne({ _id: p._id }, { projection: { name: 1 } }).catch(() => null)) as { name?: string } | null)?.name || p.name;
    await notifyJobDone({ userId: user.id, projectId: id, name, ok });
  };

  // Not awaited: the caller gets the job id immediately and the job finishes in the background.
  const done: Promise<AiOutcome> = work().then(
    async (result) => {
      await jobs.updateOne({ _id: jobId }, { $set: { status: "done", result, finishedAt: new Date() } }).catch(() => {});
      await announce(true);
      return { ok: true as const, result };
    },
    async (e) => {
      console.error("ai job", e);
      const error = (e as Error).message || "AI xatosi";
      await jobs.updateOne({ _id: jobId }, { $set: { status: "error", error, finishedAt: new Date() } }).catch(() => {});
      await announce(false);
      return { ok: false as const, error };
    },
  );
  return { jobId: String(jobId), done };
}
