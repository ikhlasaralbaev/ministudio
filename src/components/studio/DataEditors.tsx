"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { PencilSimpleLine, Plus, Trash } from "@phosphor-icons/react";
import { FIELD_TYPES, TYPE_LABEL, normalizeType } from "@/lib/dataModel";
import type { AppDoc, Collection, CollectionField, Op } from "@/lib/types";
import { Row, Section, Txt } from "./Inspector";
import { useX } from "@/i18n/client";

type Apply = (ops: Op[], coalesceKey?: string) => void;
const sel = "w-full rounded-lg bg-panel-2 px-2 py-1.5 text-[13px] outline-none focus:border-accent";

const primitive = (v: unknown) => v === null || ["string", "number", "boolean"].includes(typeof v);
/** "12" -> 12, "true" -> true, anything else stays text. */
const parsePrimitive = (raw: string): string | number | boolean => {
  const t = raw.trim();
  if (t === "true") return true;
  if (t === "false") return false;
  return t !== "" && Number.isFinite(Number(t)) ? Number(t) : raw;
};

/** App state (initial values) as key/value rows instead of JSON. Lists and objects stay editable as JSON per row. */
export function StateEditor({ doc, apply }: { doc: AppDoc; apply: Apply }) {
  const x = useX();
  const [key, setKey] = useState("");
  const entries = Object.entries(doc.state);
  return (
    <Section title={x("State (boshlang'ich qiymatlar)")}>
      {entries.length === 0 && <p className="text-[12px] text-muted">{x("Hali state yo'q.")}</p>}
      {entries.map(([k, v]) => (
        <div key={k} className="grid grid-cols-[88px_1fr] items-start gap-2">
          <span className="truncate pt-1.5 font-mono text-[12px] text-muted" title={k}>{k}</span>
          {primitive(v) ? (
            typeof v === "boolean" ? (
              <label className="flex items-center gap-2 pt-1 text-[13px]">
                <input type="checkbox" checked={v} onChange={(e) => apply([{ op: "setState", key: k, value: e.target.checked }])} /> {v ? "true" : "false"}
              </label>
            ) : (
              <Txt value={v === null ? "" : String(v)} onChange={(x) => apply([{ op: "setState", key: k, value: parsePrimitive(x) }], `state.${k}`)} />
            )
          ) : (
            <Txt multiline mono value={JSON.stringify(v, null, 1)} onChange={(x) => { try { apply([{ op: "setState", key: k, value: JSON.parse(x) }], `state.${k}`); } catch { /* keep typing */ } }} />
          )}
        </div>
      ))}
      <div className="flex gap-1.5 pt-1">
        <input value={key} onChange={(e) => setKey(e.target.value.replace(/[^a-zA-Z0-9_]/g, ""))} placeholder={x("yangi kalit")} className={sel} />
        <button className="btn btn-sm" disabled={!key || key in doc.state} onClick={() => { apply([{ op: "setState", key, value: "" }]); setKey(""); }}>
          <Plus />
        </button>
      </div>
      <p className="text-[11px] text-muted">{x("Ifodalarda state.kalit deb ishlatiladi.")}</p>
    </Section>
  );
}

/** Fields of a collection: name, type, label, relation target, select options. Static rows are edited in the Data page. */
export function CollectionEditor({ doc, c, apply }: { doc: AppDoc; c: Collection; apply: Apply }) {
  const x = useX();
  const { id } = useParams<{ id: string }>();
  const set = (patch: Partial<Collection>, key?: string) => apply([{ op: "setCollection", collection: { ...c, ...patch } }], key);
  const fields = c.fields || [];
  const setField = (i: number, p: Partial<CollectionField>, key?: string) => set({ fields: fields.map((f, k) => (k === i ? { ...f, ...p } : f)) }, key);
  const others = doc.collections.filter((x) => x.name !== c.name).map((x) => x.name);

  return (
    <Section
      title={x("Jadval · {name}", { name: c.name })}
      right={<span className="lb lb-muted">{c.mode === "static" ? x("katalog · {n} qator", { n: c.data?.length || 0 }) : x("yozuvlar")}</span>}
    >
      <Row label={x("Sarlavha")}>
        <Txt value={c.label || ""} placeholder={c.name} onChange={(v) => set({ label: v || undefined }, `c.${c.name}.label`)} />
      </Row>
      {fields.map((f, i) => {
        const t = normalizeType(f.type) ?? "text";
        return (
          <div key={i} className="space-y-1.5 rounded-lg border border-line p-2">
            <div className="grid grid-cols-[1fr_112px_auto] items-center gap-1.5">
              <Txt mono value={f.name} onChange={(v) => /^[A-Za-z][A-Za-z0-9_]*$/.test(v) && setField(i, { name: v }, `c.${c.name}.${i}.n`)} />
              <select className={sel} value={t} onChange={(e) => setField(i, { type: e.target.value, ...(e.target.value === "relation" ? {} : { ref: undefined }) })}>
                {FIELD_TYPES.map((ft) => <option key={ft} value={ft}>{x(TYPE_LABEL[ft])}</option>)}
              </select>
              <button className="btn btn-sm btn-danger" onClick={() => set({ fields: fields.filter((_, k) => k !== i) })} title={x("Maydonni olib tashlash")}><Trash /></button>
            </div>
            <Txt value={f.label || ""} placeholder={x("Ko'rinadigan nomi (ixtiyoriy)")} onChange={(v) => setField(i, { label: v || undefined }, `c.${c.name}.${i}.l`)} />
            {t === "relation" && (
              <select className={sel} value={f.ref || ""} onChange={(e) => setField(i, { ref: e.target.value || undefined })}>
                <option value="">{x("— qaysi jadvalga bog'langan —")}</option>
                {others.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            )}
            {t === "select" && (
              <Txt value={(f.options || []).join(", ")} placeholder={x("variantlar: yangi, qabul, tayyor")} onChange={(v) => setField(i, { options: v.split(",").map((x) => x.trim()).filter(Boolean) }, `c.${c.name}.${i}.o`)} />
            )}
          </div>
        );
      })}
      <button className="btn btn-sm w-full" onClick={() => set({ fields: [...fields, { name: `maydon${fields.length + 1}`, type: "text" }] })}>
        <Plus /> {x("Maydon qo'shish")}
      </button>
      <Link href={`/projects/${id}/data?source=${encodeURIComponent(c.name)}`} className="btn btn-sm w-full">
        <PencilSimpleLine /> {c.mode === "static" ? x("Qatorlarni tahrirlash") : x("Ma'lumotlarni ochish")}
      </Link>
    </Section>
  );
}
