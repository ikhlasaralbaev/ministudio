import { requireProject } from "@/lib/server/access";
import { buildSchema } from "@/lib/server/dataview";
import { handle, ok } from "@/lib/server/http";

/** Every table of the project (catalogs, records, built-ins) with typed columns and how they relate. */
export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[id]/schema">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { project } = await requireProject(id, "read");
    return ok(await buildSchema(id, project));
  });
}
