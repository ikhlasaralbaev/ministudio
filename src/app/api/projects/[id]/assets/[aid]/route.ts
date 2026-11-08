import { requireProject } from "@/lib/server/access";
import { deleteAsset } from "@/lib/server/assets";
import { fail, handle, ok } from "@/lib/server/http";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/projects/[id]/assets/[aid]">) {
  return handle(async () => {
    const { id, aid } = await ctx.params;
    await requireProject(id, "update");
    return (await deleteAsset(id, aid)) ? ok({ ok: true }) : fail("Rasm topilmadi", 404);
  });
}
