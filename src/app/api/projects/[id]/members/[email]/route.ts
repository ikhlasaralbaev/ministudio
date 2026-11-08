import { projects, memberInput } from "@/lib/server/projects";
import { requireProject } from "@/lib/server/access";
import { actor, audit } from "@/lib/server/audit";
import { checkMemberChange, normalizeEmail } from "@/lib/permissions";
import { fail, handle, ok } from "@/lib/server/http";

type Ctx = RouteContext<"/api/projects/[id]/members/[email]">;

async function params(ctx: Ctx) {
  const { id, email: raw } = await ctx.params;
  return { id, email: normalizeEmail(decodeURIComponent(raw)) };
}

export async function PATCH(req: Request, ctx: Ctx) {
  return handle(async () => {
    const { id, email } = await params(ctx);
    const { project: p, user, perms } = await requireProject(id, "read");
    const target = (p.members || []).find((m) => m.email === email);
    if (!target) return fail("A'zo topilmadi", 404);
    const input = memberInput({ ...(await req.json().catch(() => ({}))), email });
    if (!input.ok) return fail(input.error);
    const denied = checkMemberChange(perms, user.id, target, input.grant);
    if (denied) return fail(denied, 403);
    await (await projects()).updateOne(
      { _id: p._id, "members.email": email },
      {
        $set: {
          "members.$.access": input.grant.access,
          "members.$.manageMembers": input.grant.manageMembers,
          "members.$.deleteProject": input.grant.deleteProject,
        },
      },
    );
    await audit({
      ...actor(user, perms.viaAdmin),
      action: "member.update",
      projectId: id,
      targetUserId: target.userId ?? undefined,
      targetEmail: email,
      details: {
        from: { access: target.access, manageMembers: target.manageMembers, deleteProject: target.deleteProject },
        to: input.grant,
      },
    });
    return ok({ ok: true });
  });
}

export async function DELETE(_: Request, ctx: Ctx) {
  return handle(async () => {
    const { id, email } = await params(ctx);
    const { project: p, user, perms } = await requireProject(id, "read");
    const target = (p.members || []).find((m) => m.email === email);
    if (!target) return fail("A'zo topilmadi", 404);
    const denied = checkMemberChange(perms, user.id, target, null);
    if (denied) return fail(denied, 403);
    await (await projects()).updateOne({ _id: p._id }, { $pull: { members: { email } } });
    await audit({
      ...actor(user, perms.viaAdmin),
      action: "member.remove",
      projectId: id,
      targetUserId: target.userId ?? undefined,
      targetEmail: email,
      details: { self: target.userId === user.id },
    });
    return ok({ ok: true });
  });
}
