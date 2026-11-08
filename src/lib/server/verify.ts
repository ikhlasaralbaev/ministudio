import "server-only";
import type { Action, AppDoc } from "../types";
import { evaluate } from "../expr";
import { walk } from "../doc";
import { HttpError } from "./http";

/** Thrown when client-supplied data can't be trusted for a server-side computation. */
export class TamperError extends HttpError {}

const MAX_JSON = 50_000;

/** id -> canonical record from every static collection of the published doc. */
export function catalogIndex(doc: AppDoc): Map<string, Record<string, unknown>> {
  const m = new Map<string, Record<string, unknown>>();
  for (const c of doc.collections) {
    if (c.mode !== "static") continue;
    for (const rec of c.data || []) {
      const id = rec.id;
      if ((typeof id === "string" || typeof id === "number") && !m.has(String(id))) m.set(String(id), rec);
    }
  }
  return m;
}

/**
 * Deep-copies client data and, for every object whose `id` matches a catalog record,
 * overwrites the fields the record defines (price, name, ...) with the canonical values.
 * With `rejectNegative`, any negative number (e.g. qty: -5) is treated as tampering.
 */
export function canonicalize(
  value: unknown,
  catalog: Map<string, Record<string, unknown>>,
  opts: { rejectNegative?: boolean } = {},
): unknown {
  const json = JSON.stringify(value ?? null);
  if (json.length > MAX_JSON) throw new TamperError("Ma'lumot juda katta");
  const rec = (v: unknown, depth: number): unknown => {
    if (depth > 12) throw new TamperError("Ma'lumot juda chuqur");
    if (typeof v === "number") {
      if (!Number.isFinite(v) || (opts.rejectNegative && v < 0)) throw new TamperError("Noto'g'ri son qiymati");
      return v;
    }
    if (Array.isArray(v)) return v.map((x) => rec(x, depth + 1));
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, x] of Object.entries(v)) out[k] = rec(x, depth + 1);
      const id = out.id;
      const canon = typeof id === "string" || typeof id === "number" ? catalog.get(String(id)) : undefined;
      if (canon) for (const k of Object.keys(out)) if (k in canon) out[k] = canon[k];
      return out;
    }
    return v;
  };
  return rec(JSON.parse(json), 0);
}

function allActions(doc: AppDoc): Action[] {
  const out: Action[] = [];
  const add = (acts?: Action[]) => {
    for (const a of acts || []) {
      out.push(a);
      if (a.type === "if") {
        add(a.then);
        add(a.else);
      }
    }
  };
  walk(doc.screens, (n) => add(n.events?.onClick));
  return out;
}

/**
 * Recomputes a pay amount on the server: the expression must be one of the published doc's
 * pay actions, and it is evaluated over canonicalized client state (catalog prices win).
 */
export function serverAmount(
  doc: AppDoc,
  input: { amountExpr: unknown; provider: string; state: unknown; extra: unknown; user: unknown },
): number {
  const expr = String(input.amountExpr ?? "");
  const known = allActions(doc).some((a) => a.type === "pay" && a.amount === expr && a.provider === input.provider);
  if (!known) throw new TamperError("Bunday to'lov amali ilovada yo'q");

  const catalog = catalogIndex(doc);
  const state = canonicalize(input.state ?? {}, catalog, { rejectNegative: true });
  const extra = canonicalize(input.extra ?? {}, catalog, { rejectNegative: true });
  if (!state || typeof state !== "object" || Array.isArray(state)) throw new TamperError("state noto'g'ri");
  const ex = extra && typeof extra === "object" && !Array.isArray(extra) ? (extra as Record<string, unknown>) : {};

  const statics: Record<string, unknown[]> = {};
  for (const c of doc.collections) if (c.mode === "static") statics[c.name] = c.data || [];

  const amount = Number(
    evaluate(expr, {
      state,
      collections: statics,
      user: input.user,
      item: ex.item,
      index: ex.index,
      last: ex.last,
    }),
  );
  if (!Number.isFinite(amount)) throw new TamperError("Summani hisoblab bo'lmadi");
  return Math.round(amount);
}
