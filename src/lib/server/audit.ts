import "server-only";
import { db } from "./db";
import type { SessionUser } from "./access";

export type AuditAction =
  | "project.view"
  | "project.update"
  | "project.delete"
  | "project.publish"
  | "env.update"
  | "member.add"
  | "member.update"
  | "member.remove"
  | "credits.grant"
  | "user.ban"
  | "user.unban"
  | "project.suspend"
  | "project.unsuspend"
  | "broadcast"
  | "project.assignOwner"
  | "ai.generate"
  | "ai.edit"
  | "data.export";

export interface AuditEntry {
  actorId: string;
  actorEmail: string;
  asAdmin: boolean;
  action: AuditAction;
  projectId?: string;
  targetUserId?: string;
  targetEmail?: string;
  details?: Record<string, unknown>;
}

export async function audit(e: AuditEntry): Promise<void> {
  await (await db()).collection("audit").insertOne({ ...e, at: new Date() });
}

/** Shorthand for the acting user. */
export function actor(u: SessionUser, asAdmin: boolean) {
  return { actorId: u.id, actorEmail: u.email, asAdmin };
}

const seen = new Map<string, number>();
const VIEW_EVERY_MS = 60 * 60 * 1000;

/** An admin opening someone else's project is logged, at most once an hour per (admin, project) per process. */
export async function auditAdminView(user: SessionUser, projectId: string): Promise<void> {
  const key = `${user.id}:${projectId}`;
  const now = Date.now();
  if (now - (seen.get(key) ?? 0) < VIEW_EVERY_MS) return;
  seen.set(key, now);
  if (seen.size > 5000) seen.clear();
  await audit({ ...actor(user, true), action: "project.view", projectId });
}
