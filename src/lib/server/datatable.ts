import "server-only";
import ExcelJS from "exceljs";
import { db } from "./db";
import { recordsCol, tgUsersCol } from "./appdata";
import { exportTable, filterRows, paymentsTable, usersTable, type ExportTable } from "../export";
import type { ProjectRow } from "./projects";

/** Newest rows read per table; enough for small businesses, keeps memory bounded. */
export const TABLE_MAX = 10_000;
export const PAGE_SIZE = 50;

export interface TableQuery {
  source: string; // "users" | "payments" | <records collection name>
  q?: string;
  tgId?: number | null;
}

/** Records collections declared in the app (published first, then draft) plus any found in stored data. */
export async function sourcesOf(projectId: string, p: ProjectRow) {
  const declared = [...(p.publishedDoc?.collections || []), ...(p.doc?.collections || [])]
    .filter((c) => c.mode === "records")
    .map((c) => c.name);
  const d = await db();
  const [counts, users, payments] = await Promise.all([
    d
      .collection("records")
      .aggregate<{ _id: string; n: number; last: Date }>([
        { $match: { projectId } },
        { $group: { _id: "$collection", n: { $sum: 1 }, last: { $max: "$createdAt" } } },
      ])
      .toArray(),
    d.collection("tg_users").countDocuments({ projectId }),
    d.collection("payments").countDocuments({ projectId }),
  ]);
  const byName = new Map(counts.map((c) => [c._id, c]));
  const names = [...new Set([...declared, ...counts.map((c) => c._id)])];
  return {
    collections: names.map((name) => ({ name, count: byName.get(name)?.n || 0, last: byName.get(name)?.last || null })),
    users,
    payments,
  };
}

export async function buildTable(projectId: string, query: TableQuery): Promise<ExportTable> {
  const userFilter = query.tgId ? { "tgUser.id": query.tgId } : {};
  let table: ExportTable;
  if (query.source === "users") {
    const users = await (await tgUsersCol())
      .find({ projectId, ...(query.tgId ? { tgId: query.tgId } : {}) })
      .sort({ lastSeen: -1 })
      .limit(TABLE_MAX)
      .toArray();
    const counts = await (await recordsCol())
      .aggregate<{ _id: number; n: number }>([
        { $match: { projectId, "tgUser.id": { $in: users.map((u) => u.tgId) } } },
        { $group: { _id: "$tgUser.id", n: { $sum: 1 } } },
      ])
      .toArray();
    table = usersTable(users, new Map(counts.map((c) => [c._id, c.n])));
  } else if (query.source === "payments") {
    const pays = await (await db())
      .collection("payments")
      .find({ projectId, ...userFilter })
      .sort({ createdAt: -1 })
      .limit(TABLE_MAX)
      .toArray();
    table = paymentsTable(pays as never);
  } else {
    const docs = await (await recordsCol())
      .find({ projectId, collection: query.source, ...userFilter })
      .sort({ createdAt: -1 })
      .limit(TABLE_MAX)
      .toArray();
    table = exportTable(docs);
  }
  return filterRows(table, query.q || "");
}

export function parseQuery(url: string): TableQuery & { page: number; format: string } {
  const sp = new URL(url).searchParams;
  const tg = Number(sp.get("tgId"));
  return {
    source: (sp.get("source") || "users").slice(0, 100),
    q: (sp.get("q") || "").slice(0, 200),
    tgId: Number.isSafeInteger(tg) && tg > 0 ? tg : null,
    page: Math.max(1, Math.floor(Number(sp.get("page")) || 1)),
    format: sp.get("format") === "csv" ? "csv" : "xlsx",
  };
}

/** A styled workbook: bold tinted header, frozen first row, autofilter, sensible column widths. */
export async function toXlsx(t: ExportTable, sheetName: string): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "MiniStudio";
  wb.created = new Date();
  const ws = wb.addWorksheet(sheetName.replace(/[\\/?*[\]:]/g, " ").slice(0, 31) || "Data", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  ws.addRow(t.header);
  for (const r of t.rows) ws.addRow(r.map((c) => (typeof c === "string" && /^[=+\-@]/.test(c) ? "'" + c : c)));
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF7C5CFF" } };
  head.alignment = { vertical: "middle" };
  head.height = 22;
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: Math.max(1, t.header.length) } };
  t.header.forEach((h, i) => {
    const longest = Math.max(h.length, ...t.rows.slice(0, 500).map((r) => String(r[i] ?? "").length));
    ws.getColumn(i + 1).width = Math.min(50, Math.max(8, longest + 2));
  });
  return Buffer.from(await wb.xlsx.writeBuffer());
}
