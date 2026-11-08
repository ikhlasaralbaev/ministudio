"use client";
import { shownEmail } from "@/lib/display";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";
import { checkMemberChange, type Access, type Grant, type Member, type Perms } from "@/lib/permissions";
import { inputCls } from "./ui";

type Row = Member & { name?: string; image?: string | null };
interface Resp {
  owner: { userId: string; email: string; name: string; image?: string | null } | null;
  members: Row[];
}

const ACCESS_LABEL: Record<Access, string> = { read: "Ko'rish", update: "Tahrirlash" };

function Avatar({ image, email }: { image?: string | null; email: string }) {
  return image ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={image} alt="" className="h-8 w-8 rounded-full" referrerPolicy="no-referrer" />
  ) : (
    <span className="grid h-8 w-8 place-items-center rounded-full bg-panel-2 text-xs">{email[0]?.toUpperCase()}</span>
  );
}

/** Grant editor: disables any option the actor isn't allowed to hand out. */
function GrantEditor({
  value,
  onChange,
  perms,
  userId,
  target,
}: {
  value: Grant;
  onChange: (g: Grant) => void;
  perms: Perms;
  userId: string;
  target: Member | null;
}) {
  const allowed = (g: Grant) => checkMemberChange(perms, userId, target, g) === null;
  return (
    <div className="flex flex-wrap items-center gap-3 text-sm">
      <select
        className="rounded-lg border border-line bg-panel-2 px-2 py-1.5"
        value={value.access}
        onChange={(e) => onChange({ ...value, access: e.target.value as Access })}
      >
        {(["read", "update"] as Access[]).map((a) => (
          <option key={a} value={a} disabled={!allowed({ ...value, access: a })}>
            {ACCESS_LABEL[a]}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1.5">
        <input
          type="checkbox"
          checked={value.manageMembers}
          disabled={!allowed({ ...value, manageMembers: !value.manageMembers })}
          onChange={(e) => onChange({ ...value, manageMembers: e.target.checked })}
        />
        A&apos;zolarni boshqarish
      </label>
      <label className="flex items-center gap-1.5">
        <input
          type="checkbox"
          checked={value.deleteProject}
          disabled={!allowed({ ...value, deleteProject: !value.deleteProject })}
          onChange={(e) => onChange({ ...value, deleteProject: e.target.checked })}
        />
        Loyihani o&apos;chirish
      </label>
    </div>
  );
}

export function Members({ projectId, perms, userId }: { projectId: string; perms: Perms; userId: string }) {
  const router = useRouter();
  const [data, setData] = useState<Resp | null>(null);
  const [email, setEmail] = useState("");
  const [grant, setGrant] = useState<Grant>({ access: "read", manageMembers: false, deleteProject: false });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [invited, setInvited] = useState(false);
  const base = `/api/projects/${projectId}/members`;

  const load = useCallback(() => api<Resp>(base).then(setData), [base]);
  useEffect(() => {
    load().catch((e) => setMsg({ ok: false, text: e.message }));
  }, [load]);

  async function run(fn: () => Promise<unknown>, okText?: string) {
    setMsg(null);
    try {
      await fn();
      if (okText) setMsg({ ok: true, text: okText });
      await load();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    await run(async () => {
      await api(base, { method: "POST", json: { email, ...grant } });
      setEmail("");
      setInvited(true);
    }, "A'zo qo'shildi");
  }

  const keyOf = (m: Member) => `${base}/${encodeURIComponent(m.email)}`;

  async function leave(m: Member) {
    if (!confirm("Loyihadan chiqasizmi? Qaytish uchun sizni yana qo'shishlari kerak bo'ladi.")) return;
    await api(keyOf(m), { method: "DELETE" });
    router.replace("/dashboard");
  }

  const loginUrl = typeof window !== "undefined" ? `${window.location.origin}/login` : "/login";

  return (
    <section className="card p-6">
      <h2 className="mb-1 font-semibold">A&apos;zolar</h2>
      <p className="mb-4 text-sm text-muted">
        Qo&apos;shilgan odam Google akkaunti bilan kirganda loyiha uning ro&apos;yxatida paydo bo&apos;ladi.
      </p>

      {!data ? (
        <p className="text-sm text-muted">Yuklanmoqda…</p>
      ) : (
        <ul className="mb-5 divide-y divide-line">
          {data.owner && (
            <li className="flex items-center gap-3 py-3">
              <Avatar image={data.owner.image} email={data.owner.email} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{data.owner.name || shownEmail(data.owner.email)}</p>
                <p className="truncate text-xs text-muted">{shownEmail(data.owner.email)}</p>
              </div>
              <span className="rounded bg-accent/15 px-2 py-0.5 text-xs text-accent-2">Ega</span>
            </li>
          )}
          {data.members.map((m) => {
            const canEdit = checkMemberChange(perms, userId, m, { access: m.access, manageMembers: m.manageMembers, deleteProject: m.deleteProject }) === null && m.userId !== userId;
            const canRemove = checkMemberChange(perms, userId, m, null) === null;
            const isMe = m.userId === userId;
            return (
              <li key={m.email} className="flex flex-wrap items-center gap-3 py-3">
                <Avatar image={m.image} email={m.email} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    {m.name || shownEmail(m.email)}
                    {isMe && <span className="ml-2 text-xs text-muted">(siz)</span>}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {shownEmail(m.email)}
                    {m.userId === null && <span className="ml-2 text-warn">kirishini kutmoqda</span>}
                  </p>
                </div>
                {canEdit ? (
                  <GrantEditor
                    value={m}
                    perms={perms}
                    userId={userId}
                    target={m}
                    onChange={(g) => run(() => api(keyOf(m), { method: "PATCH", json: g }))}
                  />
                ) : (
                  <span className="text-xs text-muted">
                    {ACCESS_LABEL[m.access]}
                    {m.manageMembers && " · a'zolarni boshqaradi"}
                    {m.deleteProject && " · o'chira oladi"}
                  </span>
                )}
                {isMe && !perms.isOwner ? (
                  <button onClick={() => leave(m)} className="text-xs text-muted hover:text-danger">
                    Loyihadan chiqish
                  </button>
                ) : (
                  canRemove && (
                    <button
                      onClick={() => confirm(`${m.email} ni olib tashlaysizmi?`) && run(() => api(keyOf(m), { method: "DELETE" }))}
                      className="px-1 text-muted hover:text-danger"
                      title="Olib tashlash"
                    >
                      ✕
                    </button>
                  )
                )}
              </li>
            );
          })}
        </ul>
      )}

      {perms.manageMembers && (
        <form onSubmit={add} className="space-y-3 rounded-xl bg-panel-2/50 p-4">
          <input
            className={inputCls}
            type="email"
            required
            placeholder="email@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <GrantEditor value={grant} onChange={setGrant} perms={perms} userId={userId} target={null} />
            <button className="rounded-lg bg-primary px-4 py-1.5 text-sm font-medium text-white hover:bg-primary-2">Qo&apos;shish</button>
          </div>
        </form>
      )}

      {invited && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-panel-2 p-3 text-sm">
          <span className="text-muted">Kirish havolasini yuboring:</span>
          <code className="flex-1 truncate">{loginUrl}</code>
          <button type="button" onClick={() => navigator.clipboard.writeText(loginUrl)} className="text-accent-2">
            Nusxalash
          </button>
        </div>
      )}
      {msg && <p className={`mt-3 text-sm ${msg.ok ? "text-ok" : "text-danger"}`}>{msg.text}</p>}
    </section>
  );
}
