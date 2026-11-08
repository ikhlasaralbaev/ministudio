"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, timeAgo } from "@/lib/client";
import { Sparkle, Gear, Database, Trash, Robot } from "@phosphor-icons/react";
import { AiPrompt } from "@/components/AiPrompt";
import { takeIdeaDraft } from "@/lib/draft";
import { BuildingScreen } from "@/components/BuildingScreen";
import { markBuilding } from "@/lib/building";
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
  const [idea, setIdea] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  // an idea typed on the landing page before signing in lands in the prompt box
  useEffect(() => {
    const d = takeIdeaDraft();
    if (d) setIdea((cur) => cur || d);
  }, []);

  const load = () => api<Row[]>("/api/projects").then(setRows).catch((e) => setErr(e.message));
  useEffect(() => {
    load();
  }, []);

  async function create() {
    if (idea.trim().length < 5) return;
    setBusy(true);
    try {
      // the project is named from the idea; Studio starts building the app as soon as it opens
      const r = await api<{ _id: string }>("/api/projects", { method: "POST", json: { idea } });
      markBuilding(); // the loading screen stays up through the page change
      router.push(`/projects/${r._id}/studio`);
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
      {busy && <BuildingScreen fullscreen />}
      <section className="rise mb-8">
        <h1 className="mb-1 text-center text-2xl font-semibold tracking-tight sm:text-3xl">{t.dash.ideaTitle}</h1>
        <p className="mx-auto mb-5 max-w-xl text-center text-sm text-muted">{t.dash.ideaHint}</p>
        <div className="mx-auto max-w-2xl">
          <AiPrompt
            value={idea}
            onChange={setIdea}
            onSubmit={() => create()}
            busy={busy}
            busyLabel={t.dash.ideaCreating}
            submitLabel={t.dash.ideaCreate}
            placeholders={t.dash.examples}
            examples={t.dash.examples}
            footerLeft="⌘ + Enter"
            autoFocus
          />
          {err && <p className="mt-3 text-center text-sm text-danger">{err}</p>}
        </div>
      </section>

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
