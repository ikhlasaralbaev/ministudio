"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Database, Package, Robot, Table, UsersThree, CreditCard, DeviceMobile, ArrowSquareOut } from "@phosphor-icons/react";
import { api } from "@/lib/client";
import { ProjectNav } from "@/components/ui";
import { TYPE_LABEL } from "@/lib/dataModel";
import { TYPE_ICON } from "@/components/data/DataTable";
import { num } from "@/components/data/cells";
import type { SchemaEdge, SchemaNode } from "@/lib/server/dataview";
import type { ProjectDTO } from "@/lib/types";
import { useX } from "@/i18n/client";
import { T } from "@/i18n/x";

interface Schema {
  nodes: SchemaNode[];
  edges: SchemaEdge[];
}

const KIND = {
  static: { label: T("Katalog"), hint: T("ilova ichida saqlanadi, tahrirlanadi"), icon: <Package size={16} />, tone: "pur" },
  records: { label: T("Yozuvlar"), hint: T("foydalanuvchilar yozadi"), icon: <Table size={16} />, tone: "accent" },
  builtin: { label: T("Tizim"), hint: T("platforma o'zi yuritadi"), icon: <Database size={16} />, tone: "ok" },
} as const;
const EDGE = {
  ref: { label: T("bog'langan"), color: "var(--accent)", dash: "" },
  items: { label: T("tarkibida"), color: "var(--pur)", dash: "" },
  user: { label: T("foydalanuvchi"), color: "var(--muted)", dash: "5 4" },
  bot: { label: T("bot yozadi"), color: "var(--ok)", dash: "2 4" },
} as const;

const icon = (n: SchemaNode) => (n.name === "users" ? <UsersThree size={16} /> : n.name === "payments" ? <CreditCard size={16} /> : n.name === "bot" ? <Robot size={16} /> : KIND[n.kind].icon);

function NodeCard({ n, id, hot, dim, setRef, onHover }: { n: SchemaNode; id: string; hot: boolean; dim: boolean; setRef: (el: HTMLDivElement | null) => void; onHover: (name: string | null) => void }) {
  const x = useX();
  const tone = n.name === "bot" ? "ok" : KIND[n.kind].tone;
  const source = n.name === "bot" ? null : n.name;
  return (
    <div
      ref={setRef}
      onMouseEnter={() => onHover(n.name)}
      onMouseLeave={() => onHover(null)}
      className={`card w-full overflow-hidden transition ${hot ? "border-accent shadow-[0_0_0_4px_color-mix(in_srgb,var(--accent)_30%,transparent)]" : ""} ${dim ? "opacity-45" : ""}`}
    >
      <div className="flex items-center gap-2 border-b border-line bg-panel-2/50 px-3 py-2">
        <span className={`lb lb-${tone} !px-1.5`}>{icon(n)}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{n.label}</p>
          {n.label !== n.name && <p className="truncate font-mono text-[11px] text-muted">{n.name}</p>}
        </div>
        <span className="rounded-md bg-bg px-2 py-0.5 text-xs tabular-nums text-muted">{num(n.count)}</span>
      </div>
      {n.description && <p className="px-3 pt-2 text-[12px] text-muted">{n.description}</p>}
      <ul className="space-y-0.5 px-3 py-2 text-[12.5px]">
        {n.columns.slice(0, 12).map((c) => (
          <li key={c.key} className="flex items-center gap-2">
            <span className="text-muted/70">{TYPE_ICON[c.type]}</span>
            <span className="truncate font-medium">{c.label}</span>
            {c.ref ? <span className="lb lb-accent !px-1.5 !text-[10.5px]">→ {c.ref}</span> : <span className="ml-auto text-[11px] text-muted">{x(TYPE_LABEL[c.type])}</span>}
          </li>
        ))}
        {n.columns.length > 12 && <li className="text-[11px] text-muted">{x("+ yana")} {n.columns.length - 12} {x("maydon")}</li>}
        {n.columns.length === 0 && <li className="text-[11px] text-muted">{x("maydonlar hali yo'q")}</li>}
      </ul>
      {(n.usedIn.length > 0 || n.bot.length > 0 || source) && (
        <div className="space-y-1.5 border-t border-line px-3 py-2 text-[11.5px]">
          {n.usedIn.length > 0 && (
            <p className="flex flex-wrap items-center gap-1 text-muted"><DeviceMobile size={13} /> {x("ilovada:")} {n.usedIn.map((s) => <span key={s} className="lb lb-muted !text-[10.5px]">{s}</span>)}</p>
          )}
          {n.bot.map((b) => <p key={b} className="flex items-center gap-1 text-ok"><Robot size={13} /> {b}</p>)}
          {source && (
            <Link href={`/projects/${id}/data?source=${encodeURIComponent(source)}`} className="inline-flex items-center gap-1 text-accent-2 hover:underline">
              {x("Ma'lumotlarni ochish")} <ArrowSquareOut size={12} />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

export default function SchemaPage() {
  const x = useX();
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDTO | null>(null);
  const [schema, setSchema] = useState<Schema | null>(null);
  const [err, setErr] = useState("");
  const [hover, setHover] = useState<string | null>(null);
  const [paths, setPaths] = useState<{ key: string; d: string; e: SchemaEdge }[]>([]);
  const wrap = useRef<HTMLDivElement>(null);
  const refs = useRef(new Map<string, HTMLDivElement>());

  useEffect(() => {
    Promise.all([api<ProjectDTO>(`/api/projects/${id}`), api<Schema>(`/api/projects/${id}/schema`)])
      .then(([p, s]) => {
        setProject(p);
        setSchema(s);
      })
      .catch((e) => setErr(e.message));
  }, [id]);

  const cols = useMemo(() => {
    const n = schema?.nodes || [];
    return [
      n.filter((x) => x.kind === "static"),
      n.filter((x) => x.kind === "records"),
      n.filter((x) => x.kind === "builtin"),
    ];
  }, [schema]);
  const colOf = useMemo(() => new Map(cols.flatMap((c, i) => c.map((n) => [n.name, i] as const))), [cols]);

  const measure = useCallback(() => {
    const w = wrap.current;
    if (!w || !schema || getComputedStyle(w).getPropertyValue("--diagram") !== "1") return setPaths([]);
    const box = w.getBoundingClientRect();
    const rect = (name: string) => {
      const el = refs.current.get(name);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { l: r.left - box.left, r: r.right - box.left, y: r.top - box.top + Math.min(26, r.height / 2) };
    };
    const seen = new Set<string>();
    const out: { key: string; d: string; e: SchemaEdge }[] = [];
    schema.edges.forEach((e, i) => {
      const a = rect(e.from);
      const b = rect(e.to);
      if (!a || !b) return;
      const key = `${e.from}>${e.to}:${e.field}`;
      if (seen.has(key)) return;
      seen.add(key);
      const ca = colOf.get(e.from) ?? 0;
      const cb = colOf.get(e.to) ?? 0;
      let d: string;
      if (ca === cb) {
        const x = a.r + 28 + (i % 3) * 8;
        d = `M${a.r},${a.y} C${x},${a.y} ${x},${b.y} ${b.r},${b.y}`;
      } else if (ca < cb) {
        const mx = (a.r + b.l) / 2;
        d = `M${a.r},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.l},${b.y}`;
      } else {
        const mx = (a.l + b.r) / 2;
        d = `M${a.l},${a.y} C${mx},${a.y} ${mx},${b.y} ${b.r},${b.y}`;
      }
      out.push({ key: key + i, d, e });
    });
    setPaths(out);
  }, [schema, colOf]);

  useLayoutEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (wrap.current) ro.observe(wrap.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const related = (name: string) => (hover ? hover === name || schema?.edges.some((e) => (e.from === hover && e.to === name) || (e.to === hover && e.from === name)) : true);
  const label = (name: string) => schema?.nodes.find((n) => n.name === name)?.label || name;

  return (
    <div className="flex h-full flex-col">
      <ProjectNav id={id} name={project?.name} project={project} />
      <div className="scroll-thin flex-1 overflow-auto">
        <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
          <h1 className="text-xl font-semibold tracking-tight">{x("Jadvallar tuzilmasi")}</h1>
          <p className="mt-1 max-w-3xl text-sm text-muted">
            {x("Loyihangizdagi barcha jadvallar, ularning maydonlari va bir-biri bilan bog'lanishi. Bog'lanishlar maydon nomlaridan, katalog id'laridan va ilova mantig'idan avtomatik aniqlanadi.")}
          </p>
          {err && <p className="mt-4 text-danger">{err}</p>}
          {!schema && !err && <div className="mt-6 grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="ms-skeleton h-64 rounded-xl" />)}</div>}

          {schema && (
            <>
              <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted">
                {(Object.keys(KIND) as (keyof typeof KIND)[]).map((k) => (
                  <span key={k} className={`lb lb-${KIND[k].tone}`}>{KIND[k].icon} {x(KIND[k].label)}<span className="text-muted">: {x(KIND[k].hint)}</span></span>
                ))}
              </div>

              <div ref={wrap} className="schema-wrap relative mt-5">
                <svg className="pointer-events-none absolute inset-0 hidden h-full w-full overflow-visible lg:block" aria-hidden>
                  <defs>
                    {(Object.keys(EDGE) as (keyof typeof EDGE)[]).map((k) => (
                      <marker key={k} id={`arr-${k}`} viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                        <path d="M0,0 L8,4 L0,8 z" fill={EDGE[k].color} />
                      </marker>
                    ))}
                  </defs>
                  {paths.map(({ key, d, e }) => {
                    const on = !hover || hover === e.from || hover === e.to;
                    return <path key={key} d={d} fill="none" stroke={EDGE[e.kind].color} strokeWidth={on ? 1.8 : 1} strokeDasharray={EDGE[e.kind].dash} opacity={on ? 0.95 : 0.15} markerEnd={`url(#arr-${e.kind})`} className="transition-opacity" />;
                  })}
                </svg>
                <div className="grid gap-5 lg:grid-cols-3 lg:gap-x-24">
                  {cols.map((col, i) => (
                    <div key={i} className="flex flex-col gap-5">
                      {col.map((n, k) => (
                        <div key={n.name} className="rise" style={{ ["--i" as string]: k + i }}>
                          <NodeCard n={n} id={id} hot={hover === n.name} dim={!related(n.name)} onHover={setHover} setRef={(el) => void (el ? refs.current.set(n.name, el) : refs.current.delete(n.name))} />
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <h2 className="mb-3 mt-10 text-sm font-semibold uppercase tracking-wider text-muted">{x("Bog'lanishlar")}</h2>
              {schema.edges.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line p-8 text-center text-muted">{x("Jadvallar orasida bog'lanish topilmadi.")}</p>
              ) : (
                <div className="card overflow-x-auto">
                  <table className="w-full min-w-[520px] text-[13px]">
                    <thead className="text-left text-muted">
                      <tr className="border-b border-line"><th className="px-4 py-2 font-medium">{x("Jadval")}</th><th className="px-4 py-2 font-medium">{x("Maydon")}</th><th className="px-4 py-2 font-medium" /><th className="px-4 py-2 font-medium">{x("Bog'langan jadval")}</th><th className="px-4 py-2 font-medium">{x("Turi")}</th></tr>
                    </thead>
                    <tbody>
                      {schema.edges.map((e, i) => (
                        <tr key={i} className="border-b border-line/60 last:border-0" onMouseEnter={() => setHover(e.from)} onMouseLeave={() => setHover(null)}>
                          <td className="px-4 py-2 font-medium">{label(e.from)}</td>
                          <td className="px-4 py-2 font-mono text-[12px] text-muted">{e.field}</td>
                          <td className="px-2 py-2 text-muted"><ArrowRight style={{ color: EDGE[e.kind].color }} /></td>
                          <td className="px-4 py-2 font-medium">{label(e.to)}</td>
                          <td className="px-4 py-2"><span className="lb lb-muted" style={{ color: EDGE[e.kind].color }}>{x(EDGE[e.kind].label)}{e.label && e.kind !== "ref" ? `: ${e.label}` : ""}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
