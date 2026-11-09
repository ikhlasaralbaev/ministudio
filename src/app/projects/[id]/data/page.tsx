"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowsClockwise, CaretLeft, CaretRight, CreditCard, DownloadSimple, Folders, MagnifyingGlass, Package, TreeStructure, UserCircle, UsersThree, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, timeAgo } from "@/lib/client";
import { ProjectNav } from "@/components/ui";
import { Broadcast } from "@/components/Broadcast";
import { DataTable } from "@/components/data/DataTable";
import { RecordDrawer } from "@/components/data/RecordDrawer";
import { CatalogEditor } from "@/components/data/CatalogEditor";
import { num, type Lookup } from "@/components/data/cells";
import { labelOf } from "@/lib/dataModel";
import type { TableView } from "@/lib/server/dataview";
import type { Collection, ProjectDTO } from "@/lib/types";
import { useX } from "@/i18n/client";

interface Overview {
  collections: { name: string; count: number; last: string | null }[];
  users: number;
  payments: number;
}
interface UserFilter {
  tgId: number;
  label: string;
}
type Row = TableView["rows"][number];

function SourceButton({ active, icon, label, count, hint, onClick }: { active: boolean; icon: React.ReactNode; label: string; count: number | null; hint?: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition ${active ? "bg-accent/15 text-fg ring-1 ring-accent/40" : "text-fg/80 hover:bg-panel-2"}`}
    >
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-md ${active ? "bg-accent/25" : "bg-panel-2"}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{label}</span>
        {hint && <span className="block truncate text-[11px] text-muted">{hint}</span>}
      </span>
      {count !== null && <span className="rounded-md bg-panel-2 px-2 py-0.5 text-xs tabular-nums text-muted">{num(count)}</span>}
    </button>
  );
}

const Group = ({ children }: { children: React.ReactNode }) => <p className="px-2 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted first:pt-1">{children}</p>;

export default function DataPage() {
  const x = useX();
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDTO | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [source, setSource] = useState("users");
  const [q, setQ] = useState("");
  const [qLive, setQLive] = useState("");
  const [user, setUser] = useState<UserFilter | null>(null);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState("");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [view, setView] = useState<TableView | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [open, setOpen] = useState<Row | null>(null);

  // ?source=<table> opens that table directly (used by the schema page)
  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("source");
    if (s) setSource(s);
  }, []);

  const loadOverview = useCallback(() => {
    Promise.all([api<ProjectDTO>(`/api/projects/${id}`), api<Overview>(`/api/projects/${id}/data`)])
      .then(([p, o]) => {
        setProject(p);
        setOverview(o);
      })
      .catch((e) => setErr(e.message));
  }, [id]);
  useEffect(loadOverview, [loadOverview]);

  useEffect(() => {
    const t = setTimeout(() => {
      setQ(qLive);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [qLive]);

  const catalogs = useMemo(() => (project?.doc?.collections || []).filter((c) => c.mode === "static"), [project]);
  const isCatalog = catalogs.some((c) => c.name === source);
  const catalog: Collection | undefined = catalogs.find((c) => c.name === source);
  const allNames = useMemo(() => [...(project?.doc?.collections || []).map((c) => c.name), ...(overview?.collections || []).map((c) => c.name)], [project, overview]);

  const params = useMemo(() => {
    const sp = new URLSearchParams({ source, q, page: String(page) });
    if (sort) {
      sp.set("sort", sort);
      sp.set("dir", dir);
    }
    if (user) sp.set("tgId", String(user.tgId));
    for (const [k, v] of Object.entries(filters)) sp.set(`f.${k}`, v);
    return sp;
  }, [source, q, page, sort, dir, user, filters]);

  // Only the newest request may update the table (a slow earlier response must not overwrite a newer one).
  const seq = useRef(0);
  const loadTable = useCallback(() => {
    if (isCatalog) return;
    const mine = ++seq.current;
    setLoading(true);
    api<TableView>(`/api/projects/${id}/data/rows?${params}`)
      .then((t) => {
        if (mine !== seq.current) return;
        setView(t);
        setErr("");
      })
      .catch((e) => mine === seq.current && setErr(e.message))
      .finally(() => mine === seq.current && setLoading(false));
  }, [id, params, isCatalog]);
  useEffect(loadTable, [loadTable]);

  // After a save the open record shows the stored (fresh) values.
  useEffect(() => {
    if (!view) return;
    setOpen((cur) => (cur ? view.rows.find((r) => r.id === cur.id) ?? cur : cur));
  }, [view]);

  function pick(s: string, search = "") {
    setSource(s);
    setPage(1);
    setSort("");
    setFilters({});
    setOpen(null);
    setView(null);
    setQLive(search);
    setQ(search);
  }

  function openUser(tgId: number, label?: string) {
    setUser({ tgId, label: label || String(tgId) });
    const first = overview?.collections.find((c) => c.count > 0) || overview?.collections[0];
    pick(first ? first.name : "payments");
  }

  // Values that point at another table (relation columns) resolve to a readable label and a link.
  const lookup: Lookup = useCallback(
    (ref, value) => {
      const c = project?.doc?.collections.find((x) => x.name === ref);
      if (c?.mode === "static") {
        const rec = (c.data || []).find((r) => String(r.id) === String(value));
        return { label: rec ? labelOf(rec) : String(value), open: () => pick(ref, String(value)) };
      }
      return { label: `#${value}`, open: () => pick(ref, String(value)) };
    },
    [project],
  );

  const exportHref = (format: "xlsx" | "csv") => {
    const sp = new URLSearchParams({ source, q, format });
    if (user) sp.set("tgId", String(user.tgId));
    return `/api/projects/${id}/data/export?${sp}`;
  };

  const meta = (s: string) => (project?.doc?.collections || []).find((c) => c.name === s);
  const title = source === "users" ? x("Foydalanuvchilar") : source === "payments" ? x("To'lovlar") : meta(source)?.label || source;
  const pages = view ? Math.max(1, Math.ceil(view.total / view.pageSize)) : 1;
  const canEdit = !!project?.permissions.update;
  const records = overview?.collections.filter((c) => !catalogs.some((k) => k.name === c.name)) ?? [];

  return (
    <div className="flex h-full flex-col">
      <ProjectNav
        id={id}
        name={project?.name}
        project={project}
        right={
          <>
            <Link href={`/projects/${id}/schema`} className="btn">
              <TreeStructure /> {x("Tuzilma")}
            </Link>
            <Broadcast projectId={id} canSend={canEdit} />
            <button
              onClick={() => {
                loadOverview();
                loadTable();
              }}
              className="btn"
            >
              <ArrowsClockwise /> {x("Yangilash")}
            </button>
          </>
        }
      />
      <div className="flex min-h-0 flex-1">
        <aside className="scroll-thin hidden w-72 shrink-0 space-y-1 overflow-y-auto border-r border-line bg-panel p-3 md:block">
          <Group>{x("Jadvallar")}</Group>
          {records.length === 0 && <p className="px-2 py-2 text-xs text-muted">{x("Hali yozuv kolleksiyasi yo'q. Ilova buyurtma yoki ariza yozganda shu yerda paydo bo'ladi.")}</p>}
          {records.map((c) => (
            <SourceButton key={c.name} active={source === c.name} icon={<Folders size={18} />} label={meta(c.name)?.label || c.name} count={c.count} hint={c.last ? x("oxirgisi {t}", { t: timeAgo(c.last) }) : x("bo'sh")} onClick={() => pick(c.name)} />
          ))}
          {catalogs.length > 0 && <Group>{x("Katalog (tahrirlash mumkin)")}</Group>}
          {catalogs.map((c) => (
            <SourceButton key={c.name} active={source === c.name} icon={<Package size={18} />} label={c.label || c.name} count={c.data?.length ?? 0} hint={x("tovar, xizmat, menyu")} onClick={() => pick(c.name)} />
          ))}
          <Group>{x("Tizim")}</Group>
          <SourceButton active={source === "users"} icon={<UsersThree size={18} />} label={x("Foydalanuvchilar")} count={overview?.users ?? 0} hint={x("Botni yoki ilovani ochganlar")} onClick={() => pick("users")} />
          <SourceButton active={source === "payments"} icon={<CreditCard size={18} />} label={x("To'lovlar")} count={overview?.payments ?? 0} hint={x("Click va Payme")} onClick={() => pick("payments")} />
          <Link href={`/projects/${id}/schema`} className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2 text-xs text-muted hover:border-accent hover:text-fg">
            <TreeStructure size={16} /> {x("Jadvallar tuzilmasi va bog'lanishlari")}
          </Link>
        </aside>

        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
            <h2 className="mr-1 text-base font-semibold">{title}</h2>
            {!isCatalog && view && <span className="text-sm text-muted">{x("{n} ta", { n: num(view.total) })}</span>}
            {user && (
              <span className="lb lb-accent">
                <UserCircle /> {user.label}
                <button onClick={() => setUser(null)} aria-label={x("Filterni olib tashlash")}><X size={11} /></button>
              </span>
            )}
            {Object.entries(filters).map(([k, v]) => (
              <span key={k} className="lb lb-pur">
                {k}: {v}
                <button onClick={() => setFilters((f) => Object.fromEntries(Object.entries(f).filter(([x]) => x !== k)))} aria-label={x("Filterni olib tashlash")}><X size={11} /></button>
              </span>
            ))}
            {!isCatalog && (
              <div className="ml-auto flex flex-wrap items-center gap-2">
                <div className="relative">
                  <MagnifyingGlass className="pointer-events-none absolute left-2.5 top-2 text-muted" size={15} />
                  <input value={qLive} onChange={(e) => setQLive(e.target.value)} placeholder={x("Qidirish…")} className="inp h-8 w-52 pl-8" />
                </div>
                <a href={exportHref("xlsx")} className="btn btn-primary"><DownloadSimple /> Excel</a>
                <a href={exportHref("csv")} className="btn">CSV</a>
              </div>
            )}
          </div>

          {isCatalog && catalog ? (
            <CatalogEditor key={catalog.name} projectId={id} collection={catalog} allNames={allNames} canEdit={canEdit} onSaved={loadOverview} />
          ) : (
            <>
              <div className="scroll-thin relative flex-1 overflow-auto">
                {err && <p className="p-6 text-sm text-danger">{err}</p>}
                {!view && !err && (
                  <div className="space-y-2 p-4">
                    {[0, 1, 2, 3, 4, 5].map((i) => <div key={i} className="ms-skeleton h-9 rounded-md" />)}
                  </div>
                )}
                {view && view.total === 0 && !err && (
                  <div className="mx-auto max-w-sm p-16 text-center text-muted">
                    <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-xl bg-panel-2 text-2xl"><Folders /></div>
                    <p className="font-medium text-fg">{x("Hozircha ma'lumot yo'q")}</p>
                    <p className="mt-1 text-sm">{q || user || Object.keys(filters).length ? x("Qidiruv yoki filtr bo'yicha hech narsa topilmadi.") : x("Ilova ma'lumot yozganda shu yerda ko'rinadi.")}</p>
                  </div>
                )}
                {view && view.total > 0 && (
                  <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
                    <DataTable
                      columns={view.columns}
                      rows={view.rows}
                      sort={sort || (view.columns.find((c) => c.key === "_at" || c.key === "lastSeen" || c.key === "createdAt")?.key ?? "")}
                      dir={dir}
                      onSort={(k) => {
                        setDir(sort === k && dir === "desc" ? "asc" : "desc");
                        setSort(k);
                        setPage(1);
                      }}
                      filters={filters}
                      onFilter={(k, v) => {
                        setFilters((f) => ({ ...Object.fromEntries(Object.entries(f).filter(([x]) => x !== k)), ...(v ? { [k]: v } : {}) }));
                        setPage(1);
                      }}
                      onRow={(r) => (source === "users" && r.tgId ? openUser(r.tgId, String(r.cells.name || r.cells.username || r.tgId)) : setOpen(r))}
                      lookup={lookup}
                      activeId={open?.id}
                    />
                  </div>
                )}
              </div>
              {view && view.total > 0 && (
                <div className="flex items-center gap-3 border-t border-line px-4 py-2 text-sm text-muted">
                  <span>{(page - 1) * view.pageSize + 1}–{Math.min(page * view.pageSize, view.total)} / {num(view.total)}</span>
                  <div className="ml-auto flex items-center gap-1">
                    <button className="btn btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}><CaretLeft /></button>
                    <span className="px-2 tabular-nums">{page} / {pages}</span>
                    <button className="btn btn-sm" disabled={page >= pages} onClick={() => setPage(page + 1)}><CaretRight /></button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {open && view && (
        <RecordDrawer
          projectId={id}
          source={title}
          columns={view.columns}
          row={open}
          editable={view.editable}
          canEdit={canEdit}
          lookup={lookup}
          onClose={() => setOpen(null)}
          onChanged={() => {
            loadTable();
            loadOverview();
          }}
          onOpenUser={(tgId) => openUser(tgId)}
        />
      )}
    </div>
  );
}
