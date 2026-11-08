"use client";
import { useParams } from "next/navigation";
import { ArrowsClockwise, CreditCard, DownloadSimple, Folders, UserCircle, UsersThree } from "@phosphor-icons/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { api, timeAgo } from "@/lib/client";
import { ProjectNav } from "@/components/ui";
import { Broadcast } from "@/components/Broadcast";
import type { ProjectDTO } from "@/lib/types";

interface Overview {
  collections: { name: string; count: number; last: string | null }[];
  users: number;
  payments: number;
}
interface Table {
  header: string[];
  rows: (string | number)[][];
  total: number;
  page: number;
  pageSize: number;
}
interface UserFilter {
  tgId: number;
  label: string;
}

const NUM = new Set(["Summa", "Yozuvlar", "Amallar", "№", "Telegram ID"]);
const fmt = (v: string | number) => (typeof v === "number" ? v.toLocaleString("ru-RU") : v);

function SourceButton({
  active,
  icon,
  label,
  count,
  hint,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
  hint?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
        active ? "bg-accent/15 text-fg ring-1 ring-accent/40" : "text-fg/80 hover:bg-panel-2"
      }`}
    >
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base ${active ? "bg-accent/25" : "bg-panel-2"}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{label}</span>
        {hint && <span className="block truncate text-[11px] text-muted">{hint}</span>}
      </span>
      <span className="rounded-md bg-panel-2 px-2 py-0.5 text-xs tabular-nums text-muted">{count.toLocaleString("ru-RU")}</span>
    </button>
  );
}

export default function DataPage() {
  const { id } = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectDTO | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [source, setSource] = useState<string>("users");
  const [q, setQ] = useState("");
  const [qLive, setQLive] = useState("");
  const [user, setUser] = useState<UserFilter | null>(null);
  const [page, setPage] = useState(1);
  const [table, setTable] = useState<Table | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const loadOverview = useCallback(() => {
    Promise.all([api<ProjectDTO>(`/api/projects/${id}`), api<Overview>(`/api/projects/${id}/data`)])
      .then(([p, o]) => {
        setProject(p);
        setOverview(o);
      })
      .catch((e) => setErr(e.message));
  }, [id]);
  useEffect(loadOverview, [loadOverview]);

  // debounce search typing
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(qLive);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [qLive]);

  const params = useMemo(() => {
    const sp = new URLSearchParams({ source, q, page: String(page) });
    if (user) sp.set("tgId", String(user.tgId));
    return sp;
  }, [source, q, page, user]);

  const loadTable = useCallback(() => {
    setLoading(true);
    api<Table>(`/api/projects/${id}/data/table?${params}`)
      .then((t) => {
        setTable(t);
        setErr("");
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [id, params]);
  useEffect(loadTable, [loadTable]);

  function pick(s: string) {
    setSource(s);
    setPage(1);
  }

  /** From the users table: show everything this person stored. */
  function openUser(row: (string | number)[]) {
    const tgId = Number(row[2]);
    if (!tgId) return;
    setUser({ tgId, label: [row[0], row[1]].filter(Boolean).join(" ") || String(tgId) });
    const first = overview?.collections.find((c) => c.count > 0) || overview?.collections[0];
    pick(first ? first.name : "payments");
  }

  const exportHref = (format: "xlsx" | "csv") => {
    const sp = new URLSearchParams(params);
    sp.delete("page");
    sp.set("format", format);
    return `/api/projects/${id}/data/export?${sp}`;
  };

  const title = source === "users" ? "Foydalanuvchilar" : source === "payments" ? "To'lovlar" : source;
  const pages = table ? Math.max(1, Math.ceil(table.total / table.pageSize)) : 1;
  const isUsers = source === "users";

  return (
    <div className="flex h-full flex-col">
      <ProjectNav
        id={id}
        name={project?.name}
        project={project}
        right={
          <>
            <Broadcast projectId={id} canSend={!!project?.permissions.update} />
            <button
              onClick={() => {
                loadOverview();
                loadTable();
              }}
              className="btn"
            >
              <ArrowsClockwise /> Yangilash
            </button>
          </>
        }
      />
      <div className="flex min-h-0 flex-1">
        {/* sources */}
        <aside className="scroll-thin w-72 shrink-0 space-y-1 overflow-y-auto border-r border-line bg-panel p-3">
          <p className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wider text-muted">Bot foydalanuvchilari</p>
          <SourceButton active={isUsers} icon={<UsersThree />} label="Foydalanuvchilar" count={overview?.users ?? 0} hint="Ilovani ochgan odamlar" onClick={() => pick("users")} />
          <p className="px-2 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted">Kolleksiyalar</p>
          {overview?.collections.length === 0 && (
            <p className="px-3 py-2 text-xs text-muted">Ilovada hali ma&apos;lumot yoziladigan kolleksiya yo&apos;q.</p>
          )}
          {overview?.collections.map((c) => (
            <SourceButton
              key={c.name}
              active={source === c.name}
              icon={<Folders />}
              label={c.name}
              count={c.count}
              hint={c.last ? `oxirgisi ${timeAgo(c.last)}` : "hali yozuv yo'q"}
              onClick={() => pick(c.name)}
            />
          ))}
          <p className="px-2 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wider text-muted">Moliya</p>
          <SourceButton active={source === "payments"} icon={<CreditCard />} label="To'lovlar" count={overview?.payments ?? 0} hint="Click va Payme" onClick={() => pick("payments")} />
        </aside>

        {/* table */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex flex-wrap items-center gap-3 border-b border-line px-6 py-4">
            <div className="mr-auto min-w-0">
              <h1 className="truncate text-lg font-semibold">{title}</h1>
              <p className="text-xs text-muted">
                {table ? `${table.total.toLocaleString("ru-RU")} ta yozuv` : "…"}
                {user && " · faqat tanlangan foydalanuvchi"}
              </p>
            </div>
            {user && (
              <span className="flex items-center gap-2 rounded-full bg-accent/15 py-1 pl-3 pr-1.5 text-sm text-accent-2">
                <UserCircle className="mr-1 inline" /> {user.label}
                <button
                  onClick={() => {
                    setUser(null);
                    setPage(1);
                  }}
                  className="grid h-5 w-5 place-items-center rounded-full hover:bg-accent/25"
                  title="Filtrni olib tashlash"
                >
                  ✕
                </button>
              </span>
            )}
            <input
              value={qLive}
              onChange={(e) => setQLive(e.target.value)}
              placeholder="Qidirish…"
              className="w-56 rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-sm outline-none focus:border-accent"
            />
            <a
              href={exportHref("xlsx")}
              className="btn btn-primary"
            >
              <DownloadSimple className="mr-1 inline" /> Excel
            </a>
            <a href={exportHref("csv")} className="btn">
              CSV
            </a>
          </div>

          <div className="scroll-thin relative flex-1 overflow-auto">
            {err && <p className="p-6 text-sm text-danger">{err}</p>}
            {!err && table && table.total === 0 && (
              <div className="grid h-full place-items-center p-10 text-center">
                <div>
                  <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-panel-2 text-2xl">{isUsers ? <UsersThree /> : <Folders />}</div>
                  <p className="font-medium">{q ? "Hech narsa topilmadi" : "Hozircha bo'sh"}</p>
                  <p className="mt-1 max-w-sm text-sm text-muted">
                    {q
                      ? "Boshqa so'z bilan qidirib ko'ring."
                      : isUsers
                        ? "Kimdir botdagi mini ilovani ochishi bilan shu yerda paydo bo'ladi."
                        : "Foydalanuvchilar ilovada ma'lumot qoldirganda yozuvlar shu yerga tushadi."}
                  </p>
                </div>
              </div>
            )}
            {table && table.total > 0 && (
              <table className={`w-full border-separate border-spacing-0 text-sm ${loading ? "opacity-60" : ""}`}>
                <thead>
                  <tr>
                    {table.header.map((h) => (
                      <th
                        key={h}
                        className={`sticky top-0 z-10 whitespace-nowrap border-b border-line bg-panel px-4 py-2.5 text-xs font-medium text-muted ${NUM.has(h) ? "text-right" : "text-left"}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((r, i) => (
                    <tr
                      key={i}
                      onClick={isUsers ? () => openUser(r) : undefined}
                      className={`${isUsers ? "cursor-pointer" : ""} hover:bg-panel-2/60`}
                      title={isUsers ? "Shu foydalanuvchining yozuvlarini ko'rish" : undefined}
                    >
                      {r.map((c, j) => (
                        <td
                          key={j}
                          className={`max-w-[360px] truncate border-b border-line/60 px-4 py-2.5 ${
                            typeof c === "number" ? "text-right tabular-nums" : ""
                          } ${j === 0 ? "font-medium text-fg" : "text-fg/80"}`}
                          title={String(c)}
                        >
                          {c === "" ? <span className="text-muted/50">—</span> : table.header[j] === "№" || table.header[j] === "Telegram ID" ? String(c) : fmt(c)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {table && table.total > table.pageSize && (
            <div className="flex items-center justify-between border-t border-line px-6 py-3 text-sm text-muted">
              <span>
                {((page - 1) * table.pageSize + 1).toLocaleString("ru-RU")}–{Math.min(page * table.pageSize, table.total).toLocaleString("ru-RU")} /{" "}
                {table.total.toLocaleString("ru-RU")}
              </span>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded-md px-2 py-1 hover:text-fg disabled:opacity-30">
                  ← Oldingi
                </button>
                <span>
                  {page} / {pages}
                </span>
                <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded-md px-2 py-1 hover:text-fg disabled:opacity-30">
                  Keyingi →
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
