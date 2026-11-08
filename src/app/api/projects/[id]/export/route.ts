import { requireProject } from "@/lib/server/access";
import { handle } from "@/lib/server/http";

const EXPORT_FORMAT = "ministudio.app";

/** The app as a JSON file (design and logic only, never keys or customer data). */
export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[id]/export">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { project: p } = await requireProject(id, "read");
    const body = JSON.stringify({ format: EXPORT_FORMAT, version: 1, name: p.name, doc: p.doc, exportedAt: new Date().toISOString() }, null, 2);
    const file = (p.name || "app").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "app";
    return new Response(body, { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="${file}.ministudio.json"`, "cache-control": "no-store" } });
  });
}
