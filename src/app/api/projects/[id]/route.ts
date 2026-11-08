import { AppDocSchema } from "@/lib/types";
import { deleteProjectCascade, envOf, projects, toDTO } from "@/lib/server/projects";
import { requireProject } from "@/lib/server/access";
import { actor, audit } from "@/lib/server/audit";
import { fail, handle, ok } from "@/lib/server/http";
import { usersByIds } from "@/lib/server/users";
import { AI_MODELS } from "@/lib/models";

export async function GET(_: Request, ctx: RouteContext<"/api/projects/[id]">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { project: p, perms } = await requireProject(id, "read");
    const env = envOf(p);
    const owner = p.ownerId ? (await usersByIds([p.ownerId])).get(p.ownerId) : null;
    return ok({ ...toDTO(p, perms), ownerEmail: owner?.email ?? null, envKeys: Object.keys(env).filter((k) => env[k]) });
  });
}

export async function PATCH(req: Request, ctx: RouteContext<"/api/projects/[id]">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { project: p, user, perms } = await requireProject(id, "update");
    const body = await req.json();
    const set: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof body.name === "string" && body.name.trim()) set.name = body.name.trim().slice(0, 80);
    if (body.aiModel !== undefined) {
      if (!AI_MODELS.some((m) => m.id === body.aiModel)) return fail("Noma'lum model");
      set.aiModel = body.aiModel;
    }
    if (body.doc !== undefined) {
      const r = AppDocSchema.safeParse(body.doc);
      if (!r.success) return fail("Hujjat noto'g'ri: " + r.error.issues[0]?.message);
      set.doc = r.data;
    }
    await (await projects()).updateOne({ _id: p._id }, { $set: set, ...(body.pendingIdea === null ? { $unset: { pendingIdea: "", pendingRefs: "" } } : {}) });
    if (perms.viaAdmin)
      await audit({ ...actor(user, true), action: "project.update", projectId: id, details: { fields: Object.keys(set) } });
    return ok({ ok: true, updatedAt: set.updatedAt });
  });
}

export async function DELETE(_: Request, ctx: RouteContext<"/api/projects/[id]">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { project: p, user, perms } = await requireProject(id, "deleteProject");
    await deleteProjectCascade(p);
    await audit({ ...actor(user, perms.viaAdmin), action: "project.delete", projectId: id, details: { name: p.name } });
    return ok({ ok: true });
  });
}
