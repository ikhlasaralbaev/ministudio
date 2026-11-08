"use client";
import { useState } from "react";
import { ArrowSquareOut, Check, Minus, Phone } from "@phosphor-icons/react";
import { badgeTone, buildColumns, fmtMoney, labelOf, type Column } from "@/lib/dataModel";
import { fmtDate } from "@/lib/export";

export type Lookup = (ref: string, value: unknown) => { label: string; open?: () => void } | null;

export function fmtWhen(v: unknown): string {
  const s = String(v ?? "");
  if (!s) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : fmtDate(s);
}

export const num = (n: number) => n.toLocaleString("ru-RU");

export function Badge({ value }: { value: string }) {
  return <span className={`lb lb-${badgeTone(value)}`}>{value}</span>;
}

function Relation({ col, value, lookup }: { col: Column; value: unknown; lookup?: Lookup }) {
  if (value == null || value === "") return <span className="text-muted">—</span>;
  const hit = col.ref ? lookup?.(col.ref, value) : null;
  const label = hit?.label || String(value);
  return hit?.open ? (
    <button
      onClick={(e) => {
        e.stopPropagation();
        hit.open?.();
      }}
      className="lb lb-accent hover:bg-accent/15"
      title={`${col.ref} → ${label}`}
    >
      {label}
      <ArrowSquareOut size={11} />
    </button>
  ) : (
    <span className="lb lb-accent" title={col.ref}>
      {label}
    </span>
  );
}

/** One value rendered according to its column type. `compact` keeps list/object values to a short summary. */
export function CellView({ col, value, lookup, compact = true, depth = 0 }: { col: Column; value: unknown; lookup?: Lookup; compact?: boolean; depth?: number }) {
  if (value === null || value === undefined || value === "") return <span className="text-muted">—</span>;
  switch (col.type) {
    case "money":
      return <span className="tabular-nums">{fmtMoney(Number(value))} <span className="text-muted">so&apos;m</span></span>;
    case "number":
      return <span className="tabular-nums">{typeof value === "number" ? num(value) : String(value)}</span>;
    case "boolean":
      return value ? <Check weight="bold" className="text-ok" aria-label="Ha" /> : <Minus className="text-muted" aria-label="Yo'q" />;
    case "date":
      return <span className="whitespace-nowrap tabular-nums text-fg/90">{fmtWhen(value)}</span>;
    case "select":
      return <Badge value={String(value)} />;
    case "phone":
      return (
        <a href={`tel:${String(value).replace(/[^\d+]/g, "")}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 text-accent-2 hover:underline">
          <Phone size={12} /> {String(value)}
        </a>
      );
    case "url":
      return (
        <a href={String(value)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex max-w-56 items-center gap-1 truncate text-accent-2 hover:underline">
          <span className="truncate">{String(value).replace(/^https?:\/\//, "")}</span>
          <ArrowSquareOut size={11} className="shrink-0" />
        </a>
      );
    case "image":
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={String(value)} alt="" className="cell-img" loading="lazy" referrerPolicy="no-referrer" />;
    case "relation":
      return <Relation col={col} value={value} lookup={lookup} />;
    case "list":
    case "object":
      return compact ? <Summary value={value} /> : <Pretty value={value} lookup={lookup} depth={depth} />;
    default:
      return <span className="whitespace-pre-wrap break-words">{String(value)}</span>;
  }
}

/** One-line summary of nested data: "3 ta element: Osh ×2, Somsa…" / "4 maydon". */
export function Summary({ value }: { value: unknown }) {
  if (Array.isArray(value)) {
    if (!value.length) return <span className="text-muted">bo&apos;sh</span>;
    const names = value.slice(0, 3).map((x) => {
      if (x && typeof x === "object") {
        const o = x as Record<string, unknown>;
        const qty = Number(o.qty ?? o.quantity ?? o.count);
        const l = labelOf(o);
        return qty > 1 ? `${l} ×${qty}` : l;
      }
      return String(x);
    });
    return (
      <span className="inline-flex items-center gap-1.5">
        <span className="lb lb-pur">{value.length}</span>
        <span className="max-w-64 truncate text-fg/80">{names.join(", ")}{value.length > 3 ? "…" : ""}</span>
      </span>
    );
  }
  const keys = Object.keys(value as object);
  return <span className="lb lb-muted">{keys.length} maydon</span>;
}

/** Nested data as a readable structure instead of JSON: tables for lists of objects, key/value grids for objects. */
export function Pretty({ value, lookup, depth = 0 }: { value: unknown; lookup?: Lookup; depth?: number }) {
  if (depth > 3) return <span className="text-muted">…</span>;
  if (Array.isArray(value)) {
    if (!value.length) return <span className="text-muted">bo&apos;sh ro&apos;yxat</span>;
    if (value.every((x) => x && typeof x === "object" && !Array.isArray(x))) {
      const rows = value as Record<string, unknown>[];
      const cols = buildColumns(undefined, rows, []).slice(0, 8);
      // Footer total for money columns; with a quantity column the total is price × qty (an order's items).
      const qtyKey = cols.find((c) => /^(qty|quantity|count|soni|miqdor)$/i.test(c.key) && rows.every((r) => typeof r[c.key] === "number"))?.key;
      const sum = cols.filter((c) => c.type === "money" && rows.every((r) => typeof r[c.key] === "number"));
      const total = (key: string) => rows.reduce((s, r) => s + Number(r[key] || 0) * (qtyKey ? Number(r[qtyKey] ?? 1) : 1), 0);
      return (
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-[12.5px]">
            <thead className="bg-panel-2 text-left text-muted">
              <tr>
                {cols.map((c) => (
                  <th key={c.key} className="px-2.5 py-1.5 font-medium">{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="border-t border-line">
                  {cols.map((c) => (
                    <td key={c.key} className="px-2.5 py-1.5 align-top">
                      <CellView col={c} value={r[c.key]} lookup={lookup} compact={false} depth={depth + 1} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {sum.length > 0 && (
              <tfoot>
                <tr className="border-t border-line bg-panel-2/60 font-medium">
                  {cols.map((c, i) => (
                    <td key={c.key} className="px-2.5 py-1.5">
                      {sum.includes(c) ? <CellView col={c} value={total(c.key)} /> : i === 0 ? "Jami" : ""}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-1.5">
        {value.map((x, i) => (
          <span key={i} className="lb lb-muted">{String(x)}</span>
        ))}
      </div>
    );
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    const cols = buildColumns(undefined, [value as Record<string, unknown>], []);
    return (
      <dl className="grid grid-cols-[minmax(80px,auto)_1fr] gap-x-4 gap-y-1.5 rounded-lg border border-line p-2.5 text-[12.5px]">
        {entries.map(([k], i) => (
          <div key={k} className="contents">
            <dt className="text-muted">{k}</dt>
            <dd><CellView col={cols[i]} value={(value as Record<string, unknown>)[k]} lookup={lookup} compact={false} depth={depth + 1} /></dd>
          </div>
        ))}
      </dl>
    );
  }
  return <span>{String(value)}</span>;
}

/** Disclosure for the raw JSON of a value, for people who want to see exactly what is stored. */
export function RawJson({ value }: { value: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button className="text-[11px] text-muted hover:text-fg" onClick={() => setOpen(!open)}>
        {open ? "Xom ma'lumotni yashirish" : "Xom ma'lumotni ko'rsatish"}
      </button>
      {open && <pre className="scroll-thin mt-1.5 max-h-60 overflow-auto rounded-lg border border-line bg-bg p-2.5 font-mono text-[11px]">{JSON.stringify(value, null, 2)}</pre>}
    </div>
  );
}
