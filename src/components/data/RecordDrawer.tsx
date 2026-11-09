"use client";
import { useEffect, useState } from "react";
import { FloppyDisk, Trash, UserCircle, X } from "@phosphor-icons/react";
import { api } from "@/lib/client";
import { coerceInput, TYPE_LABEL, type Column } from "@/lib/dataModel";
import type { TableView } from "@/lib/server/dataview";
import { CellView, Pretty, RawJson, type Lookup } from "./cells";
import { TYPE_ICON } from "./DataTable";
import { tl } from "@/i18n/server-text";
import { useX } from "@/i18n/client";

const sys = new Set(["_number", "_at", "_user"]);
const field = "w-full rounded-md border border-line bg-bg px-2.5 py-1.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";

type Row = TableView["rows"][number];

/** Side panel for one record: typed fields (editable by people with update rights), nested data shown as tables. */
export function RecordDrawer({
  projectId,
  source,
  columns,
  row,
  editable,
  canEdit,
  lookup,
  onClose,
  onChanged,
  onOpenUser,
}: {
  projectId: string;
  source: string;
  columns: Column[];
  row: Row;
  editable: boolean;
  canEdit: boolean;
  lookup?: Lookup;
  onClose: () => void;
  onChanged: () => void;
  onOpenUser: (tgId: number) => void;
}) {
  const x = useX();
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [json, setJson] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  useEffect(() => {
    setDraft({});
    setJson({});
    setErr("");
  }, [row.id]);

  const system = columns.filter((c) => sys.has(c.key));
  const data = columns.filter((c) => !sys.has(c.key));
  const value = (c: Column) => (c.key in draft ? draft[c.key] : row.cells[c.key]);
  const dirty = Object.keys(draft).length + Object.keys(json).length > 0;
  const mayEdit = editable && canEdit;

  async function save() {
    setBusy(true);
    setErr("");
    try {
      const patch: Record<string, unknown> = { ...draft };
      for (const [k, raw] of Object.entries(json)) {
        try {
          patch[k] = JSON.parse(raw);
        } catch {
          throw new Error(x("«{k}»: JSON noto'g'ri", { k }));
        }
      }
      await api(`/api/projects/${projectId}/data/records/${row.id}`, { method: "PATCH", json: { patch } });
      setDraft({});
      setJson({});
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(x("Bu yozuv butunlay o'chiriladi. Qaytarib bo'lmaydi. Davom etamizmi?"))) return;
    setBusy(true);
    try {
      await api(`/api/projects/${projectId}/data/records/${row.id}`, { method: "DELETE" });
      onClose();
      onChanged();
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  function editor(c: Column) {
    const v = value(c);
    const set = (nv: unknown) => setDraft((d) => ({ ...d, [c.key]: nv }));
    switch (c.type) {
      case "boolean":
        return (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={!!v} onChange={(e) => set(e.target.checked)} /> {v ? x("Ha") : x("Yo'q")}
          </label>
        );
      case "select":
        return (
          <select className={field} value={String(v ?? "")} onChange={(e) => set(e.target.value)}>
            {!(c.options || []).includes(String(v ?? "")) && <option value={String(v ?? "")}>{String(v ?? "") || "—"}</option>}
            {(c.options || []).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        );
      case "number":
      case "money":
      case "date":
        return (
          <input
            className={field}
            inputMode={c.type === "date" ? "text" : "decimal"}
            placeholder={c.type === "date" ? x("2026-11-08 yoki ISO vaqt") : ""}
            defaultValue={String(v ?? "")}
            onChange={(e) => {
              const n = coerceInput(c.type, e.target.value);
              if (n !== null) set(n);
            }}
          />
        );
      case "list":
      case "object":
        return (
          <details className="text-xs text-muted">
            <summary className="cursor-pointer hover:text-fg">{x("Tahrirlash (ilg'or)")}</summary>
            <textarea
              className={field + " mt-1.5 font-mono text-xs"}
              rows={6}
              defaultValue={JSON.stringify(v, null, 2)}
              onChange={(e) => setJson((j) => ({ ...j, [c.key]: e.target.value }))}
            />
          </details>
        );
      case "image":
      case "relation":
      default:
        return <input className={field} defaultValue={String(v ?? "")} onChange={(e) => set(e.target.value)} />;
    }
  }

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[480px] flex-col border-l border-line bg-panel shadow-[var(--shadow)]">
      <header className="flex items-center gap-2 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {row.cells._number != null ? `#${row.cells._number}` : x("Yozuv")} <span className="font-normal text-muted">· {source}</span>
          </p>
        </div>
        {row.tgId ? (
          <button className="btn btn-sm ml-auto" onClick={() => onOpenUser(row.tgId!)} title={x("Shu foydalanuvchining barcha yozuvlari")}>
            <UserCircle /> {x("Foydalanuvchi")}
          </button>
        ) : (
          <span className="ml-auto" />
        )}
        <button className="btn btn-sm" onClick={onClose} aria-label={x("Yopish")}>
          <X />
        </button>
      </header>

      <div className="scroll-thin flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {system.length > 0 && (
          <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 rounded-lg border border-line bg-bg p-3 text-[13px]">
            {system.map((c) => (
              <div key={c.key} className="contents">
                <dt className="text-muted">{tl(c.label)}</dt>
                <dd><CellView col={c} value={row.cells[c.key]} /></dd>
              </div>
            ))}
          </dl>
        )}
        {data.map((c) => {
          const v = value(c);
          return (
            <div key={c.key}>
              <div className="mb-1 flex items-center gap-1.5 text-[12px] text-muted">
                {TYPE_ICON[c.type]} <span className="font-medium">{tl(c.label)}</span>
                <span className="text-muted/60">· {x(TYPE_LABEL[c.type])}{c.ref ? ` → ${c.ref}` : ""}</span>
              </div>
              {c.type !== "list" && c.type !== "object" &&
                (mayEdit ? editor(c) : (
                  <div className="text-sm">
                    <CellView col={c} value={v} lookup={lookup} compact={false} />
                  </div>
                ))}
              {(c.type === "list" || c.type === "object") && (
                <div className="space-y-1.5">
                  <Pretty value={v} lookup={lookup} />
                  {mayEdit && editor(c)}
                </div>
              )}
              {mayEdit && c.type === "relation" && v != null && v !== "" && c.ref && lookup?.(c.ref, v) && (
                <div className="mt-1.5"><CellView col={c} value={v} lookup={lookup} /></div>
              )}
            </div>
          );
        })}
        <RawJson value={Object.fromEntries(data.map((c) => [c.key, row.cells[c.key]]))} />
      </div>

      {mayEdit && (
        <footer className="space-y-2 border-t border-line px-4 py-3">
          {err && <p className="text-sm text-danger">{err}</p>}
          <div className="flex gap-2">
            <button className="btn btn-primary flex-1" disabled={!dirty || busy} onClick={save}>
              <FloppyDisk weight="fill" /> {busy ? x("Saqlanmoqda…") : x("Saqlash")}
            </button>
            <button className="btn btn-danger" disabled={busy} onClick={remove} title={x("O'chirish")}>
              <Trash />
            </button>
          </div>
        </footer>
      )}
    </aside>
  );
}
