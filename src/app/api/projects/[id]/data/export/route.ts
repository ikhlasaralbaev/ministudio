import { requireProject } from "@/lib/server/access";
import { actor, audit } from "@/lib/server/audit";
import { buildTable, parseQuery, toXlsx } from "@/lib/server/datatable";
import { toCsv } from "@/lib/export";
import { handle } from "@/lib/server/http";

const LABEL: Record<string, string> = { users: "foydalanuvchilar", payments: "tolovlar" };

/** Downloads the same table the data page shows (all matching rows) as .xlsx or .csv. */
export async function GET(req: Request, ctx: RouteContext<"/api/projects/[id]/data/export">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { project, user, perms } = await requireProject(id, "read");
    const q = parseQuery(req.url);
    const t = await buildTable(id, q);
    await audit({ ...actor(user, perms.viaAdmin), action: "data.export", projectId: id, details: { source: q.source, format: q.format, rows: t.rows.length } });

    const day = new Date().toISOString().slice(0, 10);
    const base = `${project.slug}-${(LABEL[q.source] || q.source).replace(/[^\w-]+/g, "_")}-${day}`;
    if (q.format === "csv") {
      return new Response(toCsv(t.header, t.rows), {
        headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="${base}.csv"` },
      });
    }
    const buf = await toXlsx(t, LABEL[q.source] || q.source);
    return new Response(new Uint8Array(buf), {
      headers: {
        "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "content-disposition": `attachment; filename="${base}.xlsx"`,
      },
    });
  });
}
