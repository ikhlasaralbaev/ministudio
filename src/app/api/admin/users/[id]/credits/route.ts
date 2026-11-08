import { actor, audit } from "@/lib/server/audit";
import { requireAdmin } from "@/lib/server/access";
import { addCredits } from "@/lib/server/credits";
import { fail, handle, ok } from "@/lib/server/http";
import { usersCol } from "@/lib/server/users";
import { ObjectId } from "mongodb";

/** POST { credits, note? }: an admin adds (or, negative, removes) credits. Until payments exist this is how credits are sold. */
export async function POST(req: Request, ctx: RouteContext<"/api/admin/users/[id]/credits">) {
  return handle(async () => {
    const admin = await requireAdmin();
    const { id } = await ctx.params;
    if (!ObjectId.isValid(id) || !(await usersCol().findOne({ _id: new ObjectId(id) }))) return fail("Foydalanuvchi topilmadi", 404);
    const body = await req.json().catch(() => ({}));
    const credits = Number(body?.credits);
    if (!Number.isFinite(credits) || Math.abs(credits) > 1_000_000) return fail("Miqdor noto'g'ri");
    const balance = await addCredits(id, credits, "admin", String(body?.note ?? "").slice(0, 200) || undefined);
    await audit({ ...actor(admin, true), action: "credits.grant", targetUserId: id, details: { credits } });
    return ok({ balance });
  });
}
