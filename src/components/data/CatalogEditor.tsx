"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CloudArrowUp, Plus, Trash } from "@phosphor-icons/react";
import { api } from "@/lib/client";
import { buildColumns, coerceInput, type Column } from "@/lib/dataModel";
import type { AppDoc, Collection, ProjectDTO } from "@/lib/types";
import { CellView } from "./cells";
import { TYPE_ICON } from "./DataTable";

type Rec = Record<string, unknown>;
const inp = "w-full min-w-24 rounded border border-transparent bg-transparent px-2 py-1.5 text-[13px] outline-none hover:border-line focus:border-accent focus:bg-bg";

/**
 * Spreadsheet-style editor for a static catalog (products, menu, services...). Changes are saved into the draft
 * app; "Publish" pushes them to the live mini app.
 */
export function CatalogEditor({
  projectId,
  collection,
  allNames,
  canEdit,
  onSaved,
}: {
  projectId: string;
  collection: Collection;
  allNames: string[];
  canEdit: boolean;
  onSaved: () => void;
}) {
  const [rows, setRows] = useState<Rec[]>((collection.data || []) as Rec[]);
  const [state, setState] = useState<"saved" | "saving" | "error" | "unpublished" | "publishing">("saved");
  const [err, setErr] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const columns = useMemo(() => buildColumns(collection.fields, rows, allNames), [collection.fields, rows, allNames]);

  useEffect(() => {
    setRows((collection.data || []) as Rec[]);
    setState("saved");
  }, [collection.name]); // eslint-disable-line react-hooks/exhaustive-deps

  function queueSave(next: Rec[]) {
    setRows(next);
    setState("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      try {
        // Re-read the draft so changes made meanwhile in Studio are not overwritten.
        const p = await api<ProjectDTO>(`/api/projects/${projectId}`);
        const doc = p.doc as AppDoc;
        const cols = doc.collections.map((c) => (c.name === collection.name ? { ...c, data: next } : c));
        await api(`/api/projects/${projectId}`, { method: "PATCH", json: { doc: { ...doc, collections: cols } } });
        setState("unpublished");
        setErr("");
        onSaved();
      } catch (e) {
        setErr((e as Error).message);
        setState("error");
      }
    }, 700);
  }

  async function publish() {
    setState("publishing");
    try {
      await api(`/api/projects/${projectId}/publish`, { method: "POST" });
      setState("saved");
    } catch (e) {
      setErr((e as Error).message);
      setState("error");
    }
  }

  const setCell = (i: number, c: Column, raw: string | boolean) => {
    const v = typeof raw === "boolean" ? raw : c.type === "number" || c.type === "money" || c.type === "boolean" ? coerceInput(c.type, raw) : raw;
    if (v === null) return;
    queueSave(rows.map((r, k) => (k === i ? { ...r, [c.key]: v } : r)));
  };

  const addRow = () => {
    const ids = new Set(rows.map((r) => String(r.id)));
    let n = rows.length + 1;
    while (ids.has(`${collection.name.slice(0, 1)}${n}`)) n++;
    const blank: Rec = { id: `${collection.name.slice(0, 1)}${n}` };
    for (const c of columns) if (!(c.key in blank)) blank[c.key] = c.type === "number" || c.type === "money" ? 0 : c.type === "boolean" ? false : c.type === "list" ? [] : c.type === "object" ? {} : "";
    queueSave([...rows, blank]);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4 py-2 text-sm">
        <span className="text-muted">
          {state === "saving" ? "Saqlanmoqda…" : state === "error" ? <span className="text-danger">{err || "Saqlanmadi"}</span> : state === "unpublished" ? <span className="text-warn">Qoralama saqlandi, ilovada hali eski holat</span> : state === "publishing" ? "E'lon qilinmoqda…" : "Hammasi saqlangan"}
        </span>
        {canEdit && (
          <div className="ml-auto flex gap-2">
            <button className="btn btn-sm" onClick={addRow}>
              <Plus /> Qator qo&apos;shish
            </button>
            <button className="btn btn-sm btn-primary" disabled={state === "publishing" || state === "saving"} onClick={publish}>
              <CloudArrowUp /> Ilovaga chiqarish
            </button>
          </div>
        )}
      </div>
      <div className="scroll-thin relative flex-1 overflow-auto">
        {rows.length === 0 ? (
          <p className="p-10 text-center text-muted">Katalog bo&apos;sh. {canEdit ? "«Qator qo'shish» tugmasini bosing." : ""}</p>
        ) : (
          <table className="w-full min-w-max border-separate border-spacing-0 text-[13px]">
            <thead>
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="sticky top-0 z-10 border-b border-line bg-panel px-3 py-2 text-left text-[12px] font-medium text-muted">
                    <span className="inline-flex items-center gap-1.5">{TYPE_ICON[c.type]} {c.label}</span>
                  </th>
                ))}
                {canEdit && <th className="sticky top-0 z-10 w-10 border-b border-line bg-panel" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i} className="hover:bg-panel-2/50">
                  {columns.map((c) => (
                    <td key={c.key} className="border-b border-line/60 px-1 py-0.5 align-middle">
                      {!canEdit || c.type === "list" || c.type === "object" ? (
                        <div className="px-2 py-1"><CellView col={c} value={r[c.key]} /></div>
                      ) : c.type === "boolean" ? (
                        <label className="flex px-2 py-1.5"><input type="checkbox" checked={!!r[c.key]} onChange={(e) => setCell(i, c, e.target.checked)} /></label>
                      ) : c.type === "select" ? (
                        <select className={inp} value={String(r[c.key] ?? "")} onChange={(e) => setCell(i, c, e.target.value)}>
                          {!(c.options || []).includes(String(r[c.key] ?? "")) && <option value={String(r[c.key] ?? "")}>{String(r[c.key] ?? "") || "—"}</option>}
                          {(c.options || []).map((o) => <option key={o}>{o}</option>)}
                        </select>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {c.type === "image" && !!r[c.key] && <CellView col={c} value={r[c.key]} />}
                          <input
                            className={inp + (c.type === "number" || c.type === "money" ? " text-right tabular-nums" : "")}
                            inputMode={c.type === "number" || c.type === "money" ? "decimal" : undefined}
                            defaultValue={String(r[c.key] ?? "")}
                            key={`${i}-${c.key}-${String(r.id)}`}
                            onBlur={(e) => e.target.value !== String(r[c.key] ?? "") && setCell(i, c, e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                          />
                        </div>
                      )}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="border-b border-line/60 px-1">
                      <button className="btn btn-sm btn-danger" onClick={() => window.confirm("Qator o'chirilsinmi?") && queueSave(rows.filter((_, k) => k !== i))} title="O'chirish">
                        <Trash />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

