// Typed view of schemaless data: which kind of value a field holds (money, date, status, relation...) so the
// panel can show it properly, plus guessing which collections reference each other. Pure, shared client/server.
import type { CollectionField } from "./types";
import { T } from "../i18n/x";

export type FieldType = "text" | "number" | "money" | "boolean" | "date" | "phone" | "url" | "image" | "select" | "relation" | "list" | "object";

export const TYPE_LABEL: Record<FieldType, string> = {
  text: T("Matn"),
  number: T("Son"),
  money: T("Pul"),
  boolean: T("Ha/Yo'q"),
  date: T("Sana"),
  phone: T("Telefon"),
  url: T("Havola"),
  image: T("Rasm"),
  select: T("Tanlov"),
  relation: T("Bog'lanish"),
  list: T("Ro'yxat"),
  object: T("Obyekt"),
};
export const FIELD_TYPES = Object.keys(TYPE_LABEL) as FieldType[];

export interface Column {
  key: string;
  label: string;
  type: FieldType;
  /** select: the values seen / allowed. */
  options?: string[];
  /** relation: target collection. */
  ref?: string;
  /** Written in the app's schema (true) or only inferred from stored values (false). */
  declared: boolean;
}

const MONEY = /(price|narx|summa|amount|total|jami|cost|sum|fee|balance|pul|sale)/i;
const PHONE = /(phone|tel|raqam|mobile)/i;
const IMAGE = /(img|image|photo|rasm|pic|avatar|cover)/i;
const SELECT = /(status|holat|state|type|turi|kind|category|kategoriya|tur|payment|method)/i;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}([T ]\d{2}:\d{2}.*)?$/;
const IMG_EXT = /\.(jpe?g|png|webp|gif|svg|avif)(\?|#|$)/i;

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

/** Panel type for a declared type string (the AI writes string, number, array...). */
export function normalizeType(declared?: string): FieldType | null {
  const t = (declared || "").toLowerCase();
  if ((FIELD_TYPES as string[]).includes(t)) return t as FieldType;
  if (t === "string") return "text";
  if (t === "int" || t === "integer" || t === "float" || t === "double") return "number";
  if (t === "bool") return "boolean";
  if (t === "array") return "list";
  if (t === "datetime" || t === "timestamp") return "date";
  if (t === "enum") return "select";
  if (t === "ref" || t === "reference") return "relation";
  return null;
}

/** Singular-ish forms so "categoryId" can find "categories" and "productId" can find "products". */
function stems(s: string): string[] {
  const l = s.toLowerCase();
  const out = new Set([l]);
  if (l.endsWith("ies")) out.add(l.slice(0, -3) + "y");
  if (l.endsWith("es")) out.add(l.slice(0, -2));
  if (l.endsWith("s")) out.add(l.slice(0, -1));
  return [...out];
}

/** "productId" / "product_id" / "product" -> "products" if such a collection exists. */
export function guessRef(field: string, collections: string[]): string | null {
  const m = /^(.*?)(?:_?[iI]d)$/.exec(field);
  const base = m && m[1] ? m[1] : null;
  if (!base) return null;
  const want = stems(base);
  return collections.find((c) => stems(c).some((x) => want.includes(x))) ?? null;
}

/** Type of a field from the values stored under it (null/empty are ignored). */
export function inferType(name: string, values: unknown[]): { type: FieldType; options?: string[] } {
  const vs = values.filter((v) => v !== null && v !== undefined && v !== "").slice(0, 300);
  if (!vs.length) return { type: PHONE.test(name) ? "phone" : IMAGE.test(name) ? "image" : MONEY.test(name) ? "money" : "text" };
  if (vs.every((v) => typeof v === "boolean")) return { type: "boolean" };
  if (vs.every((v) => typeof v === "number")) return { type: MONEY.test(name) ? "money" : "number" };
  if (vs.every((v) => Array.isArray(v))) return { type: "list" };
  if (vs.every(isObj)) return { type: "object" };
  if (vs.some((v) => typeof v === "object")) return { type: "object" };
  const strs = vs.map(String);
  if (strs.every((s) => ISO_DATE.test(s))) return { type: "date" };
  if (strs.every((s) => /^https?:\/\//i.test(s))) return { type: IMAGE.test(name) || strs.every((s) => IMG_EXT.test(s)) ? "image" : "url" };
  if (PHONE.test(name) && strs.every((s) => /^\+?[\d\s()-]{7,20}$/.test(s))) return { type: "phone" };
  const distinct = [...new Set(strs)];
  const short = distinct.every((s) => s.length <= 24);
  if (short && distinct.length <= 12 && (SELECT.test(name) || (strs.length >= 4 && distinct.length <= 6 && distinct.length < strs.length / 2)))
    return { type: "select", options: distinct };
  return { type: "text" };
}

/**
 * Columns of a collection: its declared fields (with their labels / refs / options) first, then every other key seen
 * in the stored rows. Types come from the declaration when it says something specific, otherwise from the values.
 */
export function buildColumns(declared: CollectionField[] | undefined, rows: Record<string, unknown>[], collectionNames: string[]): Column[] {
  const cols: Column[] = [];
  const seen = new Set<string>();
  const keys: { name: string; f?: CollectionField }[] = [];
  for (const f of declared || []) {
    if (seen.has(f.name)) continue;
    seen.add(f.name);
    keys.push({ name: f.name, f });
  }
  for (const r of rows)
    for (const k of Object.keys(r)) {
      if (seen.has(k)) continue;
      seen.add(k);
      keys.push({ name: k });
    }
  for (const { name, f } of keys) {
    const values = rows.map((r) => r[name]);
    const inferred = inferType(name, values);
    const dt = normalizeType(f?.type);
    let type: FieldType = dt && dt !== "text" && dt !== "number" ? dt : dt === "number" ? (MONEY.test(name) ? "money" : "number") : inferred.type;
    let ref = f?.ref || undefined;
    if (!ref && type !== "list" && type !== "object") {
      const g = guessRef(name, collectionNames);
      if (g) {
        ref = g;
        type = "relation";
      }
    }
    if (ref) type = "relation";
    const options = type === "select" ? (f?.options?.length ? f.options : inferred.options) : undefined;
    cols.push({ key: name, label: f?.label || name, type, ...(options ? { options } : {}), ...(ref ? { ref } : {}), declared: !!f });
  }
  return cols;
}

/** A short human label for a catalog / record row. */
export function labelOf(rec: Record<string, unknown> | null | undefined): string {
  if (!rec) return "";
  for (const k of ["name", "title", "label", "nom", "ism", "sarlavha"]) if (typeof rec[k] === "string" && rec[k]) return String(rec[k]);
  return rec.id != null ? String(rec.id) : "";
}

export const fmtMoney = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/** Stable badge color (index into the panel palette) for a select value. */
export function badgeTone(value: string): "ok" | "warn" | "danger" | "accent" | "pur" | "muted" {
  const v = value.toLowerCase();
  if (/(paid|done|accepted|active|tugal|qabul|to'lan|tayyor|yetkaz|ha$|success|completed)/.test(v)) return "ok";
  if (/(pending|kut|new|yangi|jarayon|preparing|wait|process)/.test(v)) return "warn";
  if (/(cancel|rejected|rad|bekor|fail|xato|blocked|yo'q$)/.test(v)) return "danger";
  let h = 0;
  for (const c of value) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (["accent", "pur", "muted"] as const)[h % 3];
}

/** Coerces text typed in an editor to the column's type; null = not acceptable. */
export function coerceInput(type: FieldType, raw: string): string | number | boolean | null {
  const t = raw.trim();
  switch (type) {
    case "number":
    case "money": {
      if (!t) return null;
      const n = Number(t.replace(/\s/g, "").replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }
    case "boolean":
      return /^(true|1|ha|yes|on)$/i.test(t);
    case "date":
      return !t || ISO_DATE.test(t) ? t : null;
    default:
      return raw;
  }
}
