import "server-only";
import { headers } from "next/headers";
import type { WithId } from "mongodb";
import { effectivePermissions, has, normalizeEmail, type Need, type Perms } from "../permissions";
import { auth } from "./auth";
import { HttpError } from "./http";
import { getProject, type ProjectRow } from "./projects";
import { auditAdminView } from "./audit";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  isAdmin: boolean;
}

/** Platform admins are configured only through SUPER_ADMIN_EMAILS (comma separated), never in the DB. */
export function isPlatformAdmin(email: string): boolean {
  const e = normalizeEmail(email);
  if (!e) return false;
  return (process.env.SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map(normalizeEmail)
    .filter(Boolean)
    .includes(e);
}

export async function currentUser(): Promise<SessionUser | null> {
  const s = await auth.api.getSession({ headers: await headers() });
  if (!s) return null;
  const u = s.user as typeof s.user & { banned?: boolean };
  if (u.banned) throw new HttpError("Akkaunt bloklangan", 403, "banned");
  return { id: u.id, email: normalizeEmail(u.email), name: u.name, image: u.image, isAdmin: isPlatformAdmin(u.email) };
}

export async function requireUser(): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) throw new HttpError("Kirish talab qilinadi", 401);
  return u;
}

/** Non-admins get the same 404 as any unknown path. */
export async function requireAdmin(): Promise<SessionUser> {
  const u = await requireUser();
  if (!u.isAdmin) throw new HttpError("Topilmadi", 404);
  return u;
}

/**
 * Loads a project the current user may act on. Unknown or foreign projects are 404 (existence is not revealed);
 * members lacking the needed right get 403.
 */
export async function requireProject(
  id: string,
  need: Need,
): Promise<{ project: WithId<ProjectRow>; user: SessionUser; perms: Perms }> {
  return projectForUser(await requireUser(), id, need);
}

/** Same rules as requireProject for a user who is not in the current request's session (e.g. acting through Telegram). */
export async function projectForUser(
  user: SessionUser,
  id: string,
  need: Need,
): Promise<{ project: WithId<ProjectRow>; user: SessionUser; perms: Perms }> {
  const project = await getProject(id);
  const perms = project ? effectivePermissions(project, user, user.isAdmin) : null;
  if (!project || !perms) throw new HttpError("Topilmadi", 404);
  if (!has(perms, need)) throw new HttpError("Ruxsat yo'q", 403);
  if (perms.viaAdmin) await auditAdminView(user, id);
  return { project, user, perms };
}
