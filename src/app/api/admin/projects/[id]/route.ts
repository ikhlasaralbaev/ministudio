import { requireAdmin } from "@/lib/server/access";
import { actor, audit } from "@/lib/server/audit";
import { getProject, projects } from "@/lib/server/projects";
import { userByEmail } from "@/lib/server/users";
import { fail, handle, ok } from "@/lib/server/http";

/**
 * Body, one of:
 *   { suspended: true, reason?: string } | { suspended: false }  — stop / resume the published app and bot
 *   { ownerEmail: string }                                         — give an ownerless (legacy) project an owner
 */
export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/projects/[id]">) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const p = await getProject(id);
    if (!p) return fail("Topilmadi", 404);
    const body = await req.json().catch(() => ({}));
    const col = await projects();

    if (typeof body.suspended === "boolean") {
      const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 300) : undefined;
      await col.updateOne(
        { _id: p._id },
        { $set: { suspended: body.suspended ? { at: new Date(), by: admin.id, ...(reason ? { reason } : {}) } : null } },
      );
      await audit({
        ...actor(admin, true),
        action: body.suspended ? "project.suspend" : "project.unsuspend",
        projectId: id,
        details: reason ? { reason } : undefined,
      });
      return ok({ ok: true });
    }

    if (typeof body.ownerEmail === "string") {
      if (p.ownerId) return fail("Loyihaning egasi bor");
      const u = await userByEmail(body.ownerEmail);
      if (!u) return fail("Bunday foydalanuvchi yo'q", 404);
      // Conditional update: never overwrite an owner set concurrently. The new owner can't also be a member.
      const r = await col.updateOne(
        { _id: p._id, $or: [{ ownerId: null }, { ownerId: { $exists: false } }] },
        { $set: { ownerId: u.id }, $pull: { members: { email: u.email } } },
      );
      if (!r.modifiedCount) return fail("Loyihaning egasi bor");
      await audit({ ...actor(admin, true), action: "project.assignOwner", projectId: id, targetUserId: u.id, targetEmail: u.email });
      return ok({ ok: true });
    }

    return fail("suspended yoki ownerEmail kerak");
  });
}
