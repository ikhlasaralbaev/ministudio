import { requireProject } from "@/lib/server/access";
import { sourcesOf } from "@/lib/server/datatable";
import { handle, ok } from "@/lib/server/http";

/** Overview for the data page: records collections with counts, number of Telegram users and payments. */
export async function GET(_: Request, ctx: RouteContext<"/api/projects/[id]/data">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { project } = await requireProject(id, "read");
    return ok(await sourcesOf(id, project));
  });
}
