import { requireProject } from "@/lib/server/access";
import { createProject, projects } from "@/lib/server/projects";
import { fail, handle, ok } from "@/lib/server/http";
import { ObjectId } from "mongodb";

/** A copy of the app (its design and logic only): no bot, keys, orders, versions or members. */
export async function POST(_req: Request, ctx: RouteContext<"/api/projects/[id]/duplicate">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { project: p, user } = await requireProject(id, "update");
    if (!p.doc) return fail("Ilova hali yaratilmagan, nusxalash uchun hech narsa yo'q");
    const copyId = await createProject(user.id, `${p.name} (nusxa)`);
    await (await projects()).updateOne({ _id: new ObjectId(copyId) }, { $set: { doc: p.doc, updatedAt: new Date() } });
    return ok({ _id: copyId }, 201);
  });
}
