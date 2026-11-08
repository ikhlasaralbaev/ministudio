import { projects, memberInput } from "@/lib/server/projects";
import { requireProject } from "@/lib/server/access";
import { actor, audit } from "@/lib/server/audit";
import { userByEmail, usersByIds } from "@/lib/server/users";
import { checkMemberChange, MAX_MEMBERS, type Member } from "@/lib/permissions";
import { fail, handle, ok } from "@/lib/server/http";

export async function GET(_: Request, ctx: RouteContext<"/api/projects/[id]/members">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { project: p } = await requireProject(id, "read");
    const members = p.members || [];
    const ids = [p.ownerId, ...members.map((m) => m.userId)].filter((x): x is string => !!x);
    const users = await usersByIds(ids);
    const owner = p.ownerId ? users.get(p.ownerId) : null;
    return ok({
      owner: owner ? { userId: owner.id, email: owner.email, name: owner.name, image: owner.image } : null,
      members: members.map((m) => {
        const u = m.userId ? users.get(m.userId) : undefined;
        return { ...m, name: u?.name, image: u?.image ?? null };
      }),
    });
  });
}

export async function POST(req: Request, ctx: RouteContext<"/api/projects/[id]/members">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { project: p, user, perms } = await requireProject(id, "read");
    const input = memberInput(await req.json().catch(() => null));
    if (!input.ok) return fail(input.error);
    const denied = checkMemberChange(perms, user.id, null, input.grant);
    if (denied) return fail(denied, 403);

    const existing = await userByEmail(input.email);
    if (existing && existing.id === p.ownerId) return fail("Bu foydalanuvchi loyiha egasi");
    const member: Member = {
      userId: existing?.id ?? null,
      email: input.email,
      ...input.grant,
      addedBy: user.id,
      addedAt: new Date(),
    };
    // Atomic: no duplicate email, at most MAX_MEMBERS members.
    const r = await (await projects()).updateOne(
      { _id: p._id, "members.email": { $ne: input.email }, [`members.${MAX_MEMBERS - 1}`]: { $exists: false } },
      { $push: { members: member } },
    );
    if (!r.modifiedCount) {
      if ((p.members || []).some((m) => m.email === input.email)) return fail("Bu email allaqachon qo'shilgan");
      return fail(`A'zolar soni ${MAX_MEMBERS} tadan oshmaydi`);
    }
    await audit({
      ...actor(user, perms.viaAdmin),
      action: "member.add",
      projectId: id,
      targetUserId: member.userId ?? undefined,
      targetEmail: member.email,
      details: { ...input.grant },
    });
    return ok({ member }, 201);
  });
}
