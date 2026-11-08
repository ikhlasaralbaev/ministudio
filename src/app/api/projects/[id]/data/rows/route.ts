import { requireProject } from "@/lib/server/access";
import { parseViewQuery, viewTable } from "@/lib/server/dataview";
import { handle, ok } from "@/lib/server/http";

/** One page of a table as typed rows (not flattened text): columns with types + cells with raw values. */
export async function GET(req: Request, ctx: RouteContext<"/api/projects/[id]/data/rows">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { project } = await requireProject(id, "read");
    return ok(await viewTable(id, project, parseViewQuery(req.url)));
  });
}
