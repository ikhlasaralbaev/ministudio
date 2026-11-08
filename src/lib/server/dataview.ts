import "server-only";
import { db } from "./db";
import { recordsCol, tgUsersCol } from "./appdata";
import type { ProjectRow } from "./projects";
import { buildColumns, type Column, type FieldType } from "../dataModel";
import { userLabel } from "../export";
import { walk } from "../doc";
import type { Action, AppDoc, Collection } from "../types";

const TABLE_MAX = 10_000;
export const VIEW_PAGE = 50;

export interface ViewRow {
  id: string;
  cells: Record<string, unknown>;
  tgId?: number;
}
export interface TableView {
  columns: Column[];
  rows: ViewRow[];
  total: number;
  page: number;
  pageSize: number;
  /** Which collection the rows belong to (records), for editing. */
  editable: boolean;
}

export interface ViewQuery {
  source: string;
  q: string;
  page: number;
  sort: string;
  dir: "asc" | "desc";
  filters: Record<string, string>;
  tgId: number | null;
}

export function parseViewQuery(url: string): ViewQuery {
  const sp = new URL(url).searchParams;
  const tg = Number(sp.get("tgId"));
  const filters: Record<string, string> = {};
  for (const [k, v] of sp.entries()) if (k.startsWith("f.")) filters[k.slice(2).slice(0, 80)] = v.slice(0, 200);
  return {
    source: (sp.get("source") || "users").slice(0, 100),
    q: (sp.get("q") || "").slice(0, 200),
    page: Math.max(1, Math.floor(Number(sp.get("page")) || 1)),
    sort: (sp.get("sort") || "").slice(0, 80),
    dir: sp.get("dir") === "asc" ? "asc" : "desc",
    filters,
    tgId: Number.isSafeInteger(tg) && tg > 0 ? tg : null,
  };
}

export const col = (key: string, label: string, type: FieldType, extra: Partial<Column> = {}): Column => ({ key, label, type, declared: true, ...extra });

/** Declared collections of the app: the published version wins, the draft fills the gaps. */
export function declaredCollections(p: ProjectRow): Collection[] {
  const out = new Map<string, Collection>();
  for (const c of [...(p.doc?.collections || []), ...(p.publishedDoc?.collections || [])]) out.set(c.name, c);
  return [...out.values()];
}

function compare(a: unknown, b: unknown) {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "uz", { numeric: true });
}

const text = (v: unknown) => (v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v));

function finish(columns: Column[], rows: ViewRow[], q: ViewQuery, editable: boolean): TableView {
  let list = rows;
  for (const [k, v] of Object.entries(q.filters)) list = list.filter((r) => text(r.cells[k]) === v);
  const needle = q.q.trim().toLowerCase();
  if (needle) list = list.filter((r) => Object.values(r.cells).some((c) => text(c).toLowerCase().includes(needle)));
  if (q.sort && columns.some((c) => c.key === q.sort)) {
    const s = q.dir === "asc" ? 1 : -1;
    list = [...list].sort((a, b) => s * compare(a.cells[q.sort], b.cells[q.sort]));
  }
  const start = (q.page - 1) * VIEW_PAGE;
  return { columns, rows: list.slice(start, start + VIEW_PAGE), total: list.length, page: q.page, pageSize: VIEW_PAGE, editable };
}

const PROVIDER_OPTS = ["click", "payme"];
const PAY_STATUS = ["pending", "preparing", "paid", "cancelled"];

export async function viewTable(projectId: string, p: ProjectRow, q: ViewQuery): Promise<TableView> {
  const userFilter = q.tgId ? { "tgUser.id": q.tgId } : {};
  if (q.source === "users") {
    const users = await (await tgUsersCol())
      .find({ projectId, ...(q.tgId ? { tgId: q.tgId } : {}) })
      .sort({ lastSeen: -1 })
      .limit(TABLE_MAX)
      .toArray();
    const counts = await (await recordsCol())
      .aggregate<{ _id: number; n: number }>([
        { $match: { projectId, "tgUser.id": { $in: users.map((u) => u.tgId) } } },
        { $group: { _id: "$tgUser.id", n: { $sum: 1 } } },
      ])
      .toArray();
    const n = new Map(counts.map((c) => [c._id, c.n]));
    const columns = [
      col("name", "Ism", "text"),
      col("username", "Username", "text"),
      col("tgId", "Telegram ID", "number"),
      col("lang", "Til", "select", { options: [...new Set(users.map((u) => u.languageCode).filter(Boolean))] }),
      col("premium", "Premium", "boolean"),
      col("firstSeen", "Birinchi kirish", "date"),
      col("lastSeen", "Oxirgi kirish", "date"),
      col("actions", "Amallar", "number"),
      col("records", "Yozuvlar", "number"),
      col("blocked", "Botni bloklagan", "boolean"),
    ];
    const rows = users.map((u) => ({
      id: String(u.tgId),
      tgId: u.tgId,
      cells: {
        name: [u.firstName, u.lastName].filter(Boolean).join(" "),
        username: u.username ? "@" + u.username : "",
        tgId: u.tgId,
        lang: u.languageCode,
        premium: u.isPremium,
        firstSeen: new Date(u.firstSeen).toISOString(),
        lastSeen: new Date(u.lastSeen).toISOString(),
        actions: u.actions,
        records: n.get(u.tgId) || 0,
        blocked: !!(u as { blocked?: boolean }).blocked,
      },
    }));
    return finish(columns, rows, { ...q, sort: q.sort || "lastSeen" }, false);
  }
  if (q.source === "payments") {
    const pays = await (await db()).collection("payments").find({ projectId, ...userFilter }).sort({ createdAt: -1 }).limit(TABLE_MAX).toArray();
    const columns = [
      col("orderId", "№", "number"),
      col("createdAt", "Sana", "date"),
      col("provider", "Provayder", "select", { options: PROVIDER_OPTS }),
      col("amount", "Summa", "money"),
      col("status", "Holat", "select", { options: PAY_STATUS }),
      col("description", "Izoh", "text"),
      col("user", "Foydalanuvchi", "text"),
      col("tgId", "Telegram ID", "number"),
    ];
    const rows = pays.map((x) => ({
      id: String(x._id),
      tgId: x.tgUser?.id,
      cells: {
        orderId: Number(x.orderId) || x.orderId,
        createdAt: new Date(x.createdAt).toISOString(),
        provider: x.provider,
        amount: x.amount,
        status: x.status,
        description: x.description || "",
        user: userLabel(x.tgUser),
        tgId: x.tgUser?.id ?? "",
      },
    }));
    return finish(columns, rows, { ...q, sort: q.sort || "createdAt" }, false);
  }
  // a records collection
  const docs = await (await recordsCol()).find({ projectId, collection: q.source, ...userFilter }).sort({ createdAt: -1 }).limit(TABLE_MAX).toArray();
  const decl = declaredCollections(p);
  const dataOf = (d: unknown) => (d && typeof d === "object" && !Array.isArray(d) ? (d as Record<string, unknown>) : { value: d });
  const data = docs.map((d) => dataOf(d.data));
  const fields = decl.find((c) => c.name === q.source)?.fields;
  const columns = [
    col("_number", "№", "number"),
    col("_at", "Sana", "date"),
    col("_user", "Foydalanuvchi", "text"),
    ...buildColumns(fields, data, decl.map((c) => c.name)),
  ];
  const rows = docs.map((d, i) => ({
    id: String(d._id),
    tgId: d.tgUser?.id,
    cells: { ...data[i], _number: d.number, _at: new Date(d.createdAt).toISOString(), _user: userLabel(d.tgUser) },
  }));
  return finish(columns, rows, { ...q, sort: q.sort || "_at" }, true);
}

/* ---------- schema overview: tables and how they relate ---------- */

export interface SchemaNode {
  name: string;
  label: string;
  kind: "static" | "records" | "builtin";
  description?: string;
  count: number;
  last: string | null;
  columns: Column[];
  /** Screens whose widgets read or write this collection. */
  usedIn: string[];
  /** Bot features that touch it. */
  bot: string[];
}
export interface SchemaEdge {
  from: string;
  to: string;
  field: string;
  kind: "ref" | "items" | "user" | "bot";
  label?: string;
}

function actionsOf(acts: Action[] | undefined, out: Action[] = []): Action[] {
  for (const a of acts || []) {
    out.push(a);
    if (a.type === "if") {
      actionsOf(a.then, out);
      actionsOf(a.else, out);
    }
  }
  return out;
}

/** Which screens use each collection (lists bound to it, or insert/update/delete actions on it). */
export function usageOf(doc: AppDoc | null | undefined): Map<string, string[]> {
  const m = new Map<string, Set<string>>();
  const add = (name: string, screen: string) => m.set(name, (m.get(name) || new Set()).add(screen));
  for (const s of doc?.screens || []) {
    const title = s.name || s.id;
    walk([s], (n) => {
      const src = typeof n.props?.source === "string" ? /collections\.([A-Za-z0-9_]+)/.exec(n.props.source) : null;
      if (src) add(src[1], title);
      for (const a of actionsOf(n.events?.onClick)) if ("collection" in a && a.collection) add(a.collection, title);
    });
  }
  return new Map([...m].map(([k, v]) => [k, [...v]]));
}

export async function buildSchema(projectId: string, p: ProjectRow): Promise<{ nodes: SchemaNode[]; edges: SchemaEdge[] }> {
  const d = await db();
  const decl = declaredCollections(p);
  const doc = p.publishedDoc || p.doc;
  const stored = await d
    .collection("records")
    .aggregate<{ _id: string; n: number; last: Date }>([
      { $match: { projectId } },
      { $group: { _id: "$collection", n: { $sum: 1 }, last: { $max: "$createdAt" } } },
    ])
    .toArray();
  const storedBy = new Map(stored.map((s) => [s._id, s]));
  const names = [...new Set([...decl.map((c) => c.name), ...stored.map((s) => s._id)])];
  const usage = usageOf(doc);
  const nodes: SchemaNode[] = [];
  const edges: SchemaEdge[] = [];

  // static catalogs: ids -> collection, used to find which records reference them
  const catalogIds = new Map<string, string>();
  for (const c of decl.filter((x) => x.mode === "static"))
    for (const r of c.data || []) if (r.id != null && !catalogIds.has(String(r.id))) catalogIds.set(String(r.id), c.name);

  const botFor = (name: string) => {
    const out: string[] = [];
    for (const f of doc?.bot.flows || []) if (f.saveTo === name) out.push(`So'rovnoma «${f.id}» yozadi`);
    if (doc?.bot.ownerAlerts?.some((a) => a.collection === name)) out.push("Egaga Qabul/Rad tugmalari");
    return out;
  };

  for (const name of names) {
    const c = decl.find((x) => x.name === name);
    const isStatic = c?.mode === "static";
    let rows: Record<string, unknown>[] = [];
    if (isStatic) rows = (c?.data || []) as Record<string, unknown>[];
    else {
      const docs = await (await recordsCol()).find({ projectId, collection: name }).sort({ createdAt: -1 }).limit(200).toArray();
      rows = docs.map((x) => (x.data && typeof x.data === "object" && !Array.isArray(x.data) ? (x.data as Record<string, unknown>) : { value: x.data }));
    }
    const columns = buildColumns(c?.fields, rows, names);
    const info = storedBy.get(name);
    nodes.push({
      name,
      label: c?.label || name,
      kind: isStatic ? "static" : "records",
      description: c?.description,
      count: isStatic ? rows.length : info?.n || 0,
      last: info?.last ? new Date(info.last).toISOString() : null,
      columns,
      usedIn: usage.get(name) || [],
      bot: botFor(name),
    });
    for (const k of columns) {
      if (k.type === "relation" && k.ref && k.ref !== name) edges.push({ from: name, to: k.ref, field: k.key, kind: "ref" });
      // list of items whose `id`s are catalog records, e.g. order.items -> products
      if (k.type === "list" && !isStatic) {
        const hit = new Set<string>();
        for (const r of rows) for (const it of Array.isArray(r[k.key]) ? (r[k.key] as unknown[]) : []) {
          const id = it && typeof it === "object" ? (it as Record<string, unknown>).id : undefined;
          const target = id != null ? catalogIds.get(String(id)) : undefined;
          if (target) hit.add(target);
        }
        for (const t of hit) edges.push({ from: name, to: t, field: k.key, kind: "items", label: k.key });
      }
    }
    if (!isStatic) edges.push({ from: name, to: "users", field: "tgUser", kind: "user", label: "yaratgan" });
  }
  for (const f of doc?.bot.flows || []) if (f.saveTo && names.includes(f.saveTo)) edges.push({ from: "bot", to: f.saveTo, field: f.id, kind: "bot", label: f.id });

  // built-in tables
  const [users, pays] = await Promise.all([d.collection("tg_users").countDocuments({ projectId }), d.collection("payments").countDocuments({ projectId })]);
  nodes.push(
    { name: "users", label: "Foydalanuvchilar", kind: "builtin", count: users, last: null, usedIn: [], bot: [], description: "Botni yoki ilovani ochgan Telegram foydalanuvchilari", columns: [col("name", "Ism", "text"), col("username", "Username", "text"), col("tgId", "Telegram ID", "number"), col("lang", "Til", "text"), col("lastSeen", "Oxirgi kirish", "date")] },
    { name: "payments", label: "To'lovlar", kind: "builtin", count: pays, last: null, usedIn: [], bot: [], description: "Click va Payme orqali kelgan to'lovlar", columns: [col("orderId", "№", "number"), col("amount", "Summa", "money"), col("status", "Holat", "select", { options: PAY_STATUS }), col("provider", "Provayder", "select", { options: PROVIDER_OPTS })] },
  );
  edges.push({ from: "payments", to: "users", field: "tgUser", kind: "user", label: "to'lagan" });
  if (doc?.bot.flows?.length || doc?.bot.commands?.length) {
    nodes.push({ name: "bot", label: "Telegram bot", kind: "builtin", count: (doc.bot.flows?.length || 0), last: null, usedIn: [], bot: [], description: "Buyruqlar, javoblar va so'rovnomalar", columns: [] });
  }
  return { nodes, edges };
}
