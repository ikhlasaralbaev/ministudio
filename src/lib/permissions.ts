// Project access rules. Pure functions: used by API guards on the server and by the UI on the client.

export type Access = "read" | "update";
export type Need = "read" | "update" | "manageMembers" | "deleteProject";

export interface Member {
  userId: string | null; // null = invite not yet accepted (user hasn't signed in)
  email: string; // normalized
  access: Access;
  manageMembers: boolean;
  deleteProject: boolean;
  addedBy: string;
  addedAt: Date | string;
}

export interface Grant {
  access: Access;
  manageMembers: boolean;
  deleteProject: boolean;
}

export interface Perms {
  read: boolean;
  update: boolean;
  manageMembers: boolean;
  deleteProject: boolean;
  isOwner: boolean;
  isAdmin: boolean;
  /** Platform admin acting on a project they neither own nor belong to. */
  viaAdmin: boolean;
}

export const MAX_MEMBERS = 50;

export function normalizeEmail(s: string): string {
  return String(s ?? "").trim().toLowerCase();
}

const ALL = { read: true, update: true, manageMembers: true, deleteProject: true };

/** null = the user has no relationship with the project (callers answer 404). */
export function effectivePermissions(
  p: { ownerId?: string | null; members?: Member[] },
  user: { id: string },
  isAdmin: boolean,
): Perms | null {
  if (p.ownerId && p.ownerId === user.id) return { ...ALL, isOwner: true, isAdmin, viaAdmin: false };
  const m = (p.members || []).find((x) => x.userId !== null && x.userId === user.id);
  if (m) {
    if (isAdmin) return { ...ALL, isOwner: false, isAdmin, viaAdmin: false };
    return {
      read: true,
      update: m.access === "update",
      manageMembers: !!m.manageMembers,
      deleteProject: !!m.deleteProject,
      isOwner: false,
      isAdmin: false,
      viaAdmin: false,
    };
  }
  if (isAdmin) return { ...ALL, isOwner: false, isAdmin: true, viaAdmin: true };
  return null;
}

export function has(perms: Perms, need: Need): boolean {
  return perms[need];
}

/**
 * May `actor` add (target = null), change (target + next) or remove (next = null) a member?
 * Returns null when allowed, otherwise an error message. No one can hand out rights they don't hold,
 * or touch a member stronger than themselves; anyone may leave.
 */
export function checkMemberChange(
  actor: Perms,
  actorUserId: string,
  target: Member | null,
  next: Grant | null,
): string | null {
  if (actor.isOwner || actor.isAdmin) return null;
  if (next === null && target && target.userId === actorUserId) return null;
  if (!actor.manageMembers) return "A'zolarni boshqarish huquqingiz yo'q";
  if (target) {
    if (target.access === "update" && !actor.update) return "Sizdan kuchliroq a'zoni o'zgartira olmaysiz";
    if (target.deleteProject && !actor.deleteProject) return "Sizdan kuchliroq a'zoni o'zgartira olmaysiz";
  }
  if (next) {
    if (next.access === "update" && !actor.update) return "O'zingizda yo'q huquqni bera olmaysiz (tahrirlash)";
    if (next.deleteProject && !actor.deleteProject) return "O'zingizda yo'q huquqni bera olmaysiz (loyihani o'chirish)";
  }
  return null;
}
