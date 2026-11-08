// Turning schemaless records into tables for the owner's data view and Excel/CSV exports.

type Cell = string | number;

interface TgUserLike {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
}

/** Human-readable text for any stored value (arrays of items read like "Osh ×2, Somsa"). */
export function cellText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "boolean") return v ? "Ha" : "Yo'q";
  if (Array.isArray(v))
    return v
      .map((x) => {
        if (x && typeof x === "object") {
          const o = x as Record<string, unknown>;
          const label = o.name ?? o.title ?? o.label;
          if (label == null) return JSON.stringify(o);
          const qty = Number(o.qty ?? o.quantity ?? o.count);
          return qty > 1 ? `${label} ×${qty}` : String(label);
        }
        return String(x);
      })
      .join(", ");
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Numbers stay numbers (sortable in Excel); everything else becomes text. */
function cellValue(v: unknown): Cell {
  return typeof v === "number" && Number.isFinite(v) ? v : cellText(v);
}

export function userLabel(u?: TgUserLike | null): string {
  if (!u) return "";
  const name = [u.first_name, u.last_name].filter(Boolean).join(" ");
  return [name, u.username ? "@" + u.username : ""].filter(Boolean).join(" ");
}

/** "2026-11-08 10:00" in UTC+5 (Tashkent) — the owners' local time. */
export function fmtDate(d: Date | string): string {
  const t = new Date(new Date(d).getTime() + 5 * 3600_000).toISOString();
  return `${t.slice(0, 10)} ${t.slice(11, 16)}`;
}

export interface ExportTable {
  header: string[];
  rows: Cell[][];
}

/**
 * Fixed columns (number, date, user) followed by every data field seen, in first-seen order.
 * Dates are rendered in UTC+5.
 */
export function exportTable(
  docs: { number: number; createdAt: Date | string; tgUser?: TgUserLike | null; data: unknown }[],
): ExportTable {
  const keys: string[] = [];
  const seen = new Set<string>();
  const dataOf = (d: unknown) => (d && typeof d === "object" && !Array.isArray(d) ? (d as Record<string, unknown>) : { value: d });
  for (const doc of docs)
    for (const k of Object.keys(dataOf(doc.data)))
      if (!seen.has(k)) {
        seen.add(k);
        keys.push(k);
      }
  return {
    header: ["№", "Sana", "Foydalanuvchi", "Telegram ID", ...keys],
    rows: docs.map((doc) => {
      const data = dataOf(doc.data);
      return [
        doc.number,
        fmtDate(doc.createdAt),
        userLabel(doc.tgUser),
        doc.tgUser?.id ?? "",
        ...keys.map((k) => cellValue(data[k])),
      ];
    }),
  };
}

const FORMULA = /^[=+\-@\t\r]/;

/** RFC 4180 CSV with a UTF-8 BOM (Excel opens Uzbek text correctly) and formula-injection guard. */
export function toCsv(header: string[], rows: Cell[][]): string {
  const esc = (v: Cell) => {
    let s = String(v ?? "");
    if (typeof v === "string" && FORMULA.test(s)) s = "'" + s;
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [header, ...rows].map((r) => r.map(esc).join(",")).join("\r\n") + "\r\n";
}

export function usersTable(
  users: {
    tgId: number;
    firstName: string;
    lastName: string;
    username: string;
    languageCode: string;
    isPremium: boolean;
    firstSeen: Date | string;
    lastSeen: Date | string;
    actions: number;
  }[],
  recordCounts: Map<number, number>,
): ExportTable {
  return {
    header: ["Ism", "Username", "Telegram ID", "Til", "Premium", "Birinchi kirish", "Oxirgi kirish", "Amallar", "Yozuvlar"],
    rows: users.map((u) => [
      [u.firstName, u.lastName].filter(Boolean).join(" "),
      u.username ? "@" + u.username : "",
      u.tgId,
      u.languageCode,
      u.isPremium ? "Ha" : "Yo'q",
      fmtDate(u.firstSeen),
      fmtDate(u.lastSeen),
      u.actions,
      recordCounts.get(u.tgId) || 0,
    ]),
  };
}

const PROVIDER: Record<string, string> = { click: "Click", payme: "Payme" };
const STATUS: Record<string, string> = { pending: "Kutilmoqda", preparing: "Jarayonda", paid: "To'langan", cancelled: "Bekor qilingan" };

export function paymentsTable(
  payments: {
    orderId: string;
    provider: string;
    amount: number;
    status: string;
    description?: string;
    createdAt: Date | string;
    tgUser?: TgUserLike | null;
  }[],
): ExportTable {
  return {
    header: ["№", "Sana", "Provayder", "Summa", "Holat", "Izoh", "Foydalanuvchi", "Telegram ID"],
    rows: payments.map((p) => [
      p.orderId,
      fmtDate(p.createdAt),
      PROVIDER[p.provider] || p.provider,
      p.amount,
      STATUS[p.status] || p.status,
      p.description || "",
      userLabel(p.tgUser),
      p.tgUser?.id ?? "",
    ]),
  };
}

/** Keeps rows where any cell contains `q` (case-insensitive). */
export function filterRows(t: ExportTable, q: string): ExportTable {
  const needle = q.trim().toLowerCase();
  if (!needle) return t;
  return { header: t.header, rows: t.rows.filter((r) => r.some((c) => String(c).toLowerCase().includes(needle))) };
}
