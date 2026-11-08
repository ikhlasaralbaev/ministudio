import { requireProject } from "@/lib/server/access";
import { buildTable, PAGE_SIZE, parseQuery } from "@/lib/server/datatable";
import { handle, ok } from "@/lib/server/http";

/** One page of a data table (users, payments or a records collection), filtered by text and Telegram user. */
export async function GET(req: Request, ctx: RouteContext<"/api/projects/[id]/data/table">) {
  return handle(async () => {
    const { id } = await ctx.params;
    await requireProject(id, "read");
    const q = parseQuery(req.url);
    const t = await buildTable(id, q);
    const start = (q.page - 1) * PAGE_SIZE;
    return ok({ header: t.header, rows: t.rows.slice(start, start + PAGE_SIZE), total: t.rows.length, page: q.page, pageSize: PAGE_SIZE });
  });
}
