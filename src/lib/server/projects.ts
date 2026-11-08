import "server-only";
import { ObjectId, type WithId } from "mongodb";
import { db } from "./db";
import { decryptEnv } from "./crypto";
import { tgApi } from "./telegram";
import type { AppDoc, ProjectDTO } from "../types";
import { z } from "zod";
import { customAlphabet } from "nanoid";
import { normalizeEmail, type Grant, type Member, type Perms } from "../permissions";

export interface ProjectRow {
  name: string;
  slug: string;
  doc: AppDoc | null;
  publishedDoc?: AppDoc | null;
  publishedVersion: number;
  publishedAt?: Date;
  history?: { version: number; doc: AppDoc; at: Date }[];
  envEnc?: string;
  botUsername?: string;
  /** Telegram id of a bot created through the manager bot (Managed Bots). */
  managedBotId?: number;
  /** The name was made from the first idea; the AI replaces it with a real one when it generates the app. */
  autoName?: boolean;
  /** An idea typed on the dashboard that Studio turns into the first app as soon as it opens. */
  pendingIdea?: string;
  /** Reference images uploaded with that idea; Studio hands them to the AI for the first generation. */
  pendingRefs?: string[];
  /** The uploaded logo (asset id). */
  logoAssetId?: string;
  ownerId?: string | null;
  members?: Member[];
  aiModel?: string | null;
  suspended?: { at: Date; by: string; reason?: string } | null;
  createdAt: Date;
  updatedAt: Date;
}

export const projects = async () => (await db()).collection<ProjectRow>("projects");

export function oid(id: string) {
  try {
    return new ObjectId(id);
  } catch {
    return null;
  }
}

export async function getProject(id: string) {
  const _id = oid(id);
  if (!_id) return null;
  return (await projects()).findOne({ _id }, { projection: { history: 0 } });
}

export async function getProjectBySlug(slug: string) {
  return (await projects()).findOne({ slug }, { projection: { history: 0, doc: 0 } });
}

export function toDTO(p: WithId<ProjectRow>, perms: Perms): ProjectDTO {
  return {
    _id: p._id.toHexString(),
    name: p.name,
    slug: p.slug,
    doc: p.doc,
    publishedVersion: p.publishedVersion || 0,
    publishedAt: p.publishedAt?.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    botUsername: p.botUsername,
    ownerId: p.ownerId ?? null,
    permissions: perms,
    suspended: !!p.suspended,
    aiModel: p.aiModel ?? null,
    pendingIdea: p.pendingIdea,
    pendingRefs: p.pendingRefs,
    logoUrl: p.logoAssetId ? `/api/assets/${p.logoAssetId}` : undefined,
  };
}

export function envOf(p: ProjectRow) {
  return decryptEnv(p.envEnc);
}

export function publicUrl(req?: Request) {
  const env = process.env.PUBLIC_URL?.replace(/\/$/, "");
  if (env) return env;
  if (req) {
    const u = new URL(req.url);
    const proto = req.headers.get("x-forwarded-proto") || u.protocol.replace(":", "");
    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || u.host;
    return `${proto}://${host}`;
  }
  return "http://localhost:3000";
}

const MemberInputSchema = z.object({
  email: z.string().transform(normalizeEmail).pipe(z.email()),
  access: z.enum(["read", "update"]),
  manageMembers: z.boolean().default(false),
  deleteProject: z.boolean().default(false),
});

/** Validates an add/change member request body. */
export function memberInput(body: unknown): { ok: true; email: string; grant: Grant } | { ok: false; error: string } {
  const r = MemberInputSchema.safeParse(body);
  if (!r.success) {
    const field = r.error.issues[0]?.path[0];
    return { ok: false, error: field === "email" ? "Email noto'g'ri" : "Ruxsat qiymati noto'g'ri" };
  }
  const { email, ...grant } = r.data;
  return { ok: true, email, grant };
}

/** Attach pending email invites to a user who just signed in (idempotent). */
export async function linkInvites(userId: string, email: string): Promise<void> {
  const e = normalizeEmail(email);
  await (await projects()).updateMany(
    { members: { $elemMatch: { email: e, userId: null } } },
    { $set: { "members.$[m].userId": userId } },
    { arrayFilters: [{ "m.email": e, "m.userId": null }] },
  );
}

export const SUSPENDED_TEXT = "Ilova vaqtincha to'xtatilgan";

/** Deletes a project with everything that belongs to it, and detaches its bot webhook. */
export async function deleteProjectCascade(p: WithId<ProjectRow>): Promise<void> {
  const hex = p._id.toHexString();
  const d = await db();
  const token = envOf(p).BOT_TOKEN;
  if (token) await tgApi(token, "deleteWebhook").catch(() => {});
  await Promise.all([
    d.collection("records").deleteMany({ projectId: hex }),
    d.collection("assets").deleteMany({ projectId: hex }),
    d.collection("payments").deleteMany({ projectId: hex }),
    d.collection("tg_users").deleteMany({ projectId: hex }),
    d.collection<{ _id: string }>("counters").deleteMany({ _id: { $regex: `^${hex}:` } }),
  ]);
  await d.collection("projects").deleteOne({ _id: p._id });
}

const slugId = customAlphabet("abcdefghijkmnpqrstuvwxyz23456789", 8);

/** A new empty project owned by `ownerId`. Returns its id. */
export async function createProject(ownerId: string, name: string, opts: { autoName?: boolean; pendingIdea?: string } = {}): Promise<string> {
  const now = new Date();
  const r = await (await projects()).insertOne({
    name: name.trim().slice(0, 80),
    slug: slugId(),
    doc: null,
    publishedVersion: 0,
    ownerId,
    members: [],
    ...(opts.autoName ? { autoName: true } : {}),
    ...(opts.pendingIdea ? { pendingIdea: opts.pendingIdea.slice(0, 2000) } : {}),
    createdAt: now,
    updatedAt: now,
  });
  return r.insertedId.toHexString();
}
