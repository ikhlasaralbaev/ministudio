"use client";
import { shownEmail } from "@/lib/display";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api, timeAgo } from "@/lib/client";
import { inputCls } from "@/components/ui";
import { ManagerCard } from "@/components/ManagerCard";

type Tab = "users" | "projects" | "audit";
interface Usage {
  requests: number;
  inputTokens: number;
  outputTokens: number;
}
interface Page<T> {
  items: T[];
  total: number;
  page: number;
}
interface UserRow {
  id: string;
  email: string;
  name: string;
  image: string | null;
  createdAt: string | null;
  banned: boolean;
  isAdmin: boolean;
  projects: number;
  credits: number | null;
  usage: Usage;
}
interface ProjectRow {
  _id: string;
  name: string;
  slug: string;
  owner: { id: string; email: string } | null;
  members: number;
  publishedVersion: number;
  suspended: boolean;
  updatedAt: string;
  usage: Usage;
}
interface AuditRow {
  _id: string;
  actorEmail: string;
  asAdmin: boolean;
  action: string;
  projectId?: string;
  targetEmail?: string;
  details?: Record<string, unknown>;
  at: string;
}

const PAGE = 50;
const fmtNum = (n: number) => n.toLocaleString("ru-RU");
const usageText = (u: Usage) => (u.requests ? `${fmtNum(u.requests)} · ${fmtNum(u.inputTokens)} / ${fmtNum(u.outputTokens)}` : "—");

function useList<T>(url: string) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<Page<T> | null>(null);
  const [err, setErr] = useState("");
  const load = useCallback(() => {
    const sep = url.includes("?") ? "&" : "?";
    return api<Page<T>>(`${url}${sep}q=${encodeURIComponent(q)}&page=${page}`)
      .then((d) => {
        setData(d);
        setErr("");
      })
      .catch((e) => setErr(e.message));
  }, [url, q, page]);
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
  return { q, setQ: (v: string) => (setQ(v), setPage(1)), page, setPage, data, err, reload: load };
}

function Pager({ page, total, setPage }: { page: number; total: number; setPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / PAGE));
  return (
    <div className="mt-4 flex items-center justify-between text-sm text-muted">
      <span>Jami: {fmtNum(total)}</span>
      <div className="flex items-center gap-2">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="rounded px-2 py-1 hover:text-fg disabled:opacity-30">
          ←
        </button>
        <span>
          {page} / {pages}
        </span>
        <button disabled={page >= pages} onClick={() => setPage(page + 1)} className="rounded px-2 py-1 hover:text-fg disabled:opacity-30">
          →
        </button>
      </div>
    </div>
  );
}

const th = "px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-muted";
const td = "px-3 py-2.5 align-middle";

function Users() {
  const l = useList<UserRow>("/api/admin/users");
  async function toggle(u: UserRow) {
    const ban = !u.banned;
    if (!confirm(ban ? `${shownEmail(u.email)} bloklansinmi? Barcha sessiyalari darhol tugaydi.` : `${shownEmail(u.email)} blokdan chiqarilsinmi?`)) return;
    try {
      await api(`/api/admin/users/${u.id}`, { method: "PATCH", json: { banned: ban } });
      l.reload();
    } catch (e) {
      alert((e as Error).message);
    }
  }
  async function grant(u: UserRow) {
    const v = prompt(`${u.name || shownEmail(u.email)}: nechta kredit qo'shilsin? (kamaytirish uchun minus bilan yozing)`, "100");
    if (v === null) return;
    const credits = Number(v.replace(",", "."));
    if (!Number.isFinite(credits) || credits === 0) return alert("Miqdor noto'g'ri");
    try {
      await api(`/api/admin/users/${u.id}/credits`, { method: "POST", json: { credits } });
      l.reload();
    } catch (e) {
      alert((e as Error).message);
    }
  }
  return (
    <>
      <input className={inputCls + " mb-4 max-w-sm"} placeholder="Email yoki ism bo'yicha qidirish" value={l.q} onChange={(e) => l.setQ(e.target.value)} />
      {l.err && <p className="mb-3 text-sm text-danger">{l.err}</p>}
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-panel">
            <tr>
              <th className={th}>Foydalanuvchi</th>
              <th className={th}>Ro&apos;yxatdan o&apos;tgan</th>
              <th className={th}>Loyihalar</th>
              <th className={th}>AI: so&apos;rov · kirish/chiqish token</th>
              <th className={th}>Kredit</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {l.data?.items.map((u) => (
              <tr key={u.id} className={u.banned ? "opacity-60" : ""}>
                <td className={td}>
                  <p className="font-medium">
                    {u.name || shownEmail(u.email)}
                    {u.isAdmin && <span className="ml-2 rounded bg-accent/15 px-1.5 py-0.5 text-[11px] text-accent-2">admin</span>}
                    {u.banned && <span className="ml-2 rounded bg-danger/15 px-1.5 py-0.5 text-[11px] text-danger">bloklangan</span>}
                  </p>
                  <p className="text-xs text-muted">{shownEmail(u.email)}</p>
                </td>
                <td className={td + " text-muted"}>{u.createdAt ? timeAgo(u.createdAt) : "—"}</td>
                <td className={td}>{u.projects}</td>
                <td className={td + " font-mono text-xs"}>{usageText(u.usage)}</td>
                <td className={td + " font-mono text-xs"}>{u.isAdmin ? "∞" : u.credits === null ? "—" : u.credits}</td>
                <td className={td + " space-x-3 text-right"}>
                  {!u.isAdmin && (
                    <button onClick={() => grant(u)} className="text-xs text-accent-2 hover:underline">
                      Kredit
                    </button>
                  )}
                  {!u.isAdmin && (
                    <button onClick={() => toggle(u)} className={`text-xs ${u.banned ? "text-ok" : "text-danger"} hover:underline`}>
                      {u.banned ? "Blokdan chiqarish" : "Bloklash"}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {l.data && <Pager page={l.page} total={l.data.total} setPage={l.setPage} />}
    </>
  );
}

function Projects() {
  const [ownerless, setOwnerless] = useState(false);
  const l = useList<ProjectRow>(`/api/admin/projects${ownerless ? "?ownerless=1" : ""}`);
  async function patch(p: ProjectRow, json: Record<string, unknown>) {
    try {
      await api(`/api/admin/projects/${p._id}`, { method: "PATCH", json });
      l.reload();
    } catch (e) {
      alert((e as Error).message);
    }
  }
  function suspend(p: ProjectRow) {
    if (p.suspended) {
      if (confirm(`"${p.name}" qayta yoqilsinmi?`)) patch(p, { suspended: false });
      return;
    }
    const reason = prompt(`"${p.name}" to'xtatilsinmi? Ilova va bot foydalanuvchilar uchun ishlamay qoladi.\n\nSabab (ixtiyoriy):`);
    if (reason !== null) patch(p, { suspended: true, reason });
  }
  function assignOwner(p: ProjectRow) {
    const email = prompt(`"${p.name}" loyihasiga ega tayinlash. Foydalanuvchi emaili (u kamida bir marta kirgan bo'lishi kerak):`);
    if (email?.trim()) patch(p, { ownerEmail: email.trim() });
  }
  return (
    <>
      <div className="mb-4 flex items-center gap-4">
        <input className={inputCls + " max-w-sm"} placeholder="Nomi yoki slug bo'yicha qidirish" value={l.q} onChange={(e) => l.setQ(e.target.value)} />
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={ownerless} onChange={(e) => setOwnerless(e.target.checked)} />
          Faqat egasizlar
        </label>
      </div>
      {l.err && <p className="mb-3 text-sm text-danger">{l.err}</p>}
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-panel">
            <tr>
              <th className={th}>Loyiha</th>
              <th className={th}>Ega</th>
              <th className={th}>A&apos;zolar</th>
              <th className={th}>Holat</th>
              <th className={th}>AI</th>
              <th className={th} />
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {l.data?.items.map((p) => (
              <tr key={p._id}>
                <td className={td}>
                  <p className="font-medium">{p.name}</p>
                  <p className="text-xs text-muted">
                    {p.slug} · {timeAgo(p.updatedAt)}
                  </p>
                </td>
                <td className={td}>
                  {p.owner ? (
                    <span className="text-muted">{shownEmail(p.owner.email)}</span>
                  ) : (
                    <span className="rounded bg-warn/15 px-1.5 py-0.5 text-[11px] text-warn">Egasiz</span>
                  )}
                </td>
                <td className={td}>{p.members}</td>
                <td className={td}>
                  {p.suspended ? (
                    <span className="rounded bg-danger/15 px-1.5 py-0.5 text-[11px] text-danger">To&apos;xtatilgan</span>
                  ) : p.publishedVersion ? (
                    <span className="text-ok">v{p.publishedVersion}</span>
                  ) : (
                    <span className="text-muted">e&apos;lon qilinmagan</span>
                  )}
                </td>
                <td className={td + " font-mono text-xs"}>{usageText(p.usage)}</td>
                <td className={td}>
                  <div className="flex justify-end gap-3 text-xs">
                    <Link href={`/projects/${p._id}/studio`} className="text-accent-2 hover:underline">
                      Ochish
                    </Link>
                    {!p.owner && (
                      <button onClick={() => assignOwner(p)} className="text-warn hover:underline">
                        Ega tayinlash
                      </button>
                    )}
                    <button onClick={() => suspend(p)} className={`${p.suspended ? "text-ok" : "text-danger"} hover:underline`}>
                      {p.suspended ? "Yoqish" : "To'xtatish"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {l.data && <Pager page={l.page} total={l.data.total} setPage={l.setPage} />}
    </>
  );
}

const ACTION_LABEL: Record<string, string> = {
  "project.view": "Loyihani ko'rdi",
  "project.update": "Loyihani tahrirladi",
  "project.delete": "Loyihani o'chirdi",
  "project.publish": "Publish qildi",
  "env.update": "Sozlamalarni o'zgartirdi",
  "member.add": "A'zo qo'shdi",
  "member.update": "A'zo ruxsatini o'zgartirdi",
  "member.remove": "A'zoni olib tashladi",
  "credits.grant": "Kredit qo'shdi",
  "user.ban": "Foydalanuvchini blokladi",
  "user.unban": "Blokdan chiqardi",
  "project.suspend": "Loyihani to'xtatdi",
  "project.unsuspend": "Loyihani yoqdi",
  "project.assignOwner": "Ega tayinladi",
  "ai.generate": "AI: ilova yaratdi",
  "ai.edit": "AI: tahrirladi",
  "data.export": "Ma'lumotlarni yuklab oldi",
};

function Audit() {
  const l = useList<AuditRow>("/api/admin/audit");
  return (
    <>
      {l.err && <p className="mb-3 text-sm text-danger">{l.err}</p>}
      <div className="overflow-x-auto rounded-xl border border-line">
        <table className="w-full text-sm">
          <thead className="bg-panel">
            <tr>
              <th className={th}>Vaqt</th>
              <th className={th}>Kim</th>
              <th className={th}>Amal</th>
              <th className={th}>Obyekt</th>
              <th className={th}>Tafsilot</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {l.data?.items.map((a) => (
              <tr key={a._id}>
                <td className={td + " whitespace-nowrap text-muted"}>{new Date(a.at).toLocaleString("ru-RU")}</td>
                <td className={td}>
                  {a.actorEmail}
                  {a.asAdmin && <span className="ml-2 rounded bg-warn/15 px-1.5 py-0.5 text-[11px] text-warn">admin</span>}
                </td>
                <td className={td}>{ACTION_LABEL[a.action] || a.action}</td>
                <td className={td + " text-muted"}>
                  {a.projectId && (
                    <Link href={`/projects/${a.projectId}/studio`} className="font-mono text-xs text-accent-2 hover:underline">
                      {a.projectId.slice(-6)}
                    </Link>
                  )}
                  {a.targetEmail && <span className="ml-2">{a.targetEmail}</span>}
                </td>
                <td className={td + " max-w-xs truncate font-mono text-xs text-muted"} title={a.details ? JSON.stringify(a.details) : ""}>
                  {a.details ? JSON.stringify(a.details) : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {l.data && <Pager page={l.page} total={l.data.total} setPage={l.setPage} />}
    </>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("users");
  const [allowed, setAllowed] = useState<boolean | null>(null);
  useEffect(() => {
    api<{ isAdmin: boolean }>("/api/me")
      .then((m) => setAllowed(m.isAdmin))
      .catch(() => setAllowed(false));
  }, []);

  if (allowed === null) return <p className="p-10 text-muted">Yuklanmoqda…</p>;
  if (!allowed) return <p className="p-10 text-muted">Topilmadi</p>;

  const tabs: { id: Tab; label: string }[] = [
    { id: "users", label: "Foydalanuvchilar" },
    { id: "projects", label: "Loyihalar" },
    { id: "audit", label: "Jurnal" },
  ];
  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Platforma admini</h1>
        <p className="text-sm text-muted">Foydalanuvchilar, loyihalar va jurnal</p>
      </header>
      <ManagerCard />
      <nav className="mb-6 flex gap-1 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm ${tab === t.id ? "border-accent text-fg" : "border-transparent text-muted hover:text-fg"}`}
          >
            {t.label}
          </button>
        ))}
      </nav>
      {tab === "users" ? <Users /> : tab === "projects" ? <Projects /> : <Audit />}
    </main>
  );
}
