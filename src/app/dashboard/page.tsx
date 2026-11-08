"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, timeAgo } from "@/lib/client";
import { Plus, Sparkle, Gear, Database, Trash, Robot } from "@phosphor-icons/react";
import { fmt } from "@/i18n/app";
import { useT } from "@/i18n/client";
import type { Perms } from "@/lib/permissions";

interface Row {
  _id: string;
  name: string;
  slug: string;
  publishedVersion: number;
  updatedAt: string;
  botUsername?: string;
  screens: number;
  theme?: { primary: string; background: string };
  permissions: Perms;
  suspended: boolean;
}

export default function Dashboard() {
  const t = useT();
  const router = useRouter();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = () => api<Row[]>("/api/projects").then(setRows).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
  }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      const r = await api<{ _id: string }>("/api/projects", { method: "POST", json: { name } });
      router.push(`/projects/${r._id}/settings?new=1`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  async function remove(p: Row) {
    const typed = prompt(fmt(t.dash.confirm, { name: p.name }));
    if (typed === null) return;
    if (typed.trim() !== p.name.trim()) {
      alert(t.dash.mismatch);
      return;
    }
    await api(`/api/projects/${p._id}`, { method: "DELETE" });
    load();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <form onSubmit={create} className="card rise mb-8 p-5 sm:p-6">
        <h1 className="mb-1 flex items-center gap-2 text-lg font-semibold">
          <Sparkle weight="fill" className="text-pur" /> {t.dash.newTitle}
        </h1>
        <p className="mb-4 text-sm text-muted">{t.dash.newHint}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t.dash.placeholder} className="inp h-10 flex-1 text-[15px]" />
          <button disabled={busy || !name.trim()} className="btn btn-primary h-10">
            <Plus weight="bold" /> {busy ? t.dash.creating : t.dash.create}
          </button>
        </div>
        {err && <p className="mt-3 text-sm text-danger">{err}</p>}
      </form>

      {!rows ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="ms-skeleton h-56 rounded-xl border border-line" />
          ))}
        </div>
      ) : (
        <>
          <Section title={t.dash.mine} rows={rows.filter((p) => p.permissions.isOwner)} empty={t.dash.empty} onRemove={remove} />
          {rows.some((p) => !p.permissions.isOwner) && (
            <Section title={t.dash.member} rows={rows.filter((p) => !p.permissions.isOwner)} onRemove={remove} />
          )}
        </>
      )}
    </main>
  );
}

function Section({ title, rows, empty, onRemove }: { title: string; rows: Row[]; empty?: string; onRemove: (p: Row) => void }) {
  const t = useT();
  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">{title}</h2>
      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-line p-10 text-center text-muted">{empty}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p, i) => (
            <div key={p._id} style={{ ["--i" as string]: i }} className="rise card group p-4 transition hover:border-muted">
              <Link href={`/projects/${p._id}/studio`} className="block">
                <div
                  className="relative mb-4 flex h-28 items-end overflow-hidden rounded-lg border border-line p-3"
                  style={{
                    background: p.theme
                      ? `linear-gradient(135deg, ${p.theme.primary}, ${p.theme.primary}55)`
                      : "linear-gradient(135deg, var(--panel-2), var(--panel))",
                  }}
                >
                  <Robot size={64} weight="duotone" className="absolute -right-2 -top-2 text-white/15 transition group-hover:scale-110" />
                  <span className="rounded-full bg-black/40 px-2.5 py-0.5 text-xs text-white">
                    {p.screens ? fmt(t.dash.screens, { n: p.screens }) : t.dash.blank}
                  </span>
                </div>
                <h3 className="flex flex-wrap items-center gap-2 font-semibold">
                  {p.name}
                  {!p.permissions.isOwner && (
                    <span className="lb lb-accent">{p.permissions.update ? t.dash.edit : t.dash.view}</span>
                  )}
                  {p.suspended && <span className="lb lb-danger">{t.dash.suspended}</span>}
                </h3>
                <p className="mt-1 text-xs text-muted">
                  {p.publishedVersion ? fmt(t.dash.published, { n: p.publishedVersion }) : t.dash.unpublished} · {timeAgo(p.updatedAt)}
                  {p.botUsername ? ` · @${p.botUsername}` : ""}
                </p>
              </Link>
              <div className="mt-4 flex items-center gap-2">
                <Link href={`/projects/${p._id}/studio`} className="btn btn-sm"><Sparkle /> {t.nav.studio}</Link>
                <Link href={`/projects/${p._id}/settings`} className="btn btn-sm" title={t.nav.settings}><Gear /></Link>
                <Link href={`/projects/${p._id}/data`} className="btn btn-sm" title={t.nav.data}><Database /></Link>
                {p.permissions.deleteProject && (
                  <button onClick={() => onRemove(p)} className="btn btn-sm btn-danger ml-auto" title={t.dash.del}>
                    <Trash />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
