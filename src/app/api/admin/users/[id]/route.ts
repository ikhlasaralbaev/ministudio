import { ObjectId } from "mongodb";
import { requireAdmin, isPlatformAdmin } from "@/lib/server/access";
import { auth } from "@/lib/server/auth";
import { actor, audit } from "@/lib/server/audit";
import { usersCol } from "@/lib/server/users";
import { fail, handle, ok } from "@/lib/server/http";

/** Body: { banned: boolean }. A ban ends every session at once; published apps keep running. */
export async function PATCH(req: Request, ctx: RouteContext<"/api/admin/users/[id]">) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    if (typeof body.banned !== "boolean") return fail("banned (true/false) kerak");
    if (!ObjectId.isValid(id)) return fail("Foydalanuvchi topilmadi", 404);
    const target = await usersCol().findOne({ _id: new ObjectId(id) });
    if (!target) return fail("Foydalanuvchi topilmadi", 404);
    if (body.banned && (id === admin.id || isPlatformAdmin(target.email))) return fail("Adminni bloklab bo'lmaydi");

    await usersCol().updateOne({ _id: target._id }, { $set: { banned: body.banned } });
    if (body.banned) await (await auth.$context).internalAdapter.deleteUserSessions(id);
    await audit({
      ...actor(admin, true),
      action: body.banned ? "user.ban" : "user.unban",
      targetUserId: id,
      targetEmail: target.email,
    });
    return ok({ ok: true });
  });
}
