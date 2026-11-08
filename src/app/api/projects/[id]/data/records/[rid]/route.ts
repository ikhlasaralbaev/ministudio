import { ObjectId } from "mongodb";
import { requireProject } from "@/lib/server/access";
import { recordsCol } from "@/lib/server/appdata";
import { actor, audit } from "@/lib/server/audit";
import { fail, handle, ok } from "@/lib/server/http";

const KEY = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;

/** Owner edits a stored record: PATCH { patch: { field: value } } (null removes the field). */
export async function PATCH(req: Request, ctx: RouteContext<"/api/projects/[id]/data/records/[rid]">) {
  return handle(async () => {
    const { id, rid } = await ctx.params;
    const { user, perms } = await requireProject(id, "update");
    if (!ObjectId.isValid(rid)) return fail("Yozuv topilmadi", 404);
    const body = await req.json();
    const patch = body?.patch;
    if (!patch || typeof patch !== "object" || Array.isArray(patch)) return fail("patch obyekt bo'lishi kerak");
    if (JSON.stringify(patch).length > 50_000) return fail("Ma'lumot juda katta");
    const set: Record<string, unknown> = { updatedAt: new Date() };
    const unset: Record<string, ""> = {};
    for (const [k, v] of Object.entries(patch)) {
      if (!KEY.test(k)) return fail(`Noto'g'ri maydon nomi: ${k}`);
      if (v === null) unset[`data.${k}`] = "";
      else set[`data.${k}`] = v;
    }
    const r = await (await recordsCol()).findOneAndUpdate(
      { _id: new ObjectId(rid), projectId: id, data: { $type: "object" } },
      { $set: set, ...(Object.keys(unset).length ? { $unset: unset } : {}) },
      { returnDocument: "after" },
    );
    if (!r) return fail("Yozuv topilmadi", 404);
    if (perms.viaAdmin) await audit({ ...actor(user, true), action: "project.update", projectId: id, details: { record: rid } });
    return ok({ id: rid, data: r.data });
  });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/projects/[id]/data/records/[rid]">) {
  return handle(async () => {
    const { id, rid } = await ctx.params;
    const { user, perms } = await requireProject(id, "update");
    if (!ObjectId.isValid(rid)) return fail("Yozuv topilmadi", 404);
    const r = await (await recordsCol()).deleteOne({ _id: new ObjectId(rid), projectId: id });
    if (!r.deletedCount) return fail("Yozuv topilmadi", 404);
    if (perms.viaAdmin) await audit({ ...actor(user, true), action: "project.update", projectId: id, details: { deletedRecord: rid } });
    return ok({ ok: true });
  });
}
