"use client";
import { useCallback, useEffect, useState } from "react";
import { PaperPlaneTilt, X } from "@phosphor-icons/react";
import { api, timeAgo } from "@/lib/client";
import { inputCls } from "@/components/ui";

interface Item {
  id: string;
  text: string;
  status: "running" | "done" | "error";
  total: number;
  sent: number;
  failed: number;
  blocked: number;
  createdAt: string;
  by: string;
}
interface Info {
  audience: number;
  maxPerDay: number;
  items: Item[];
}

/** "Send a message to everyone who used the bot": button + dialog with progress of the latest sends. */
export function Broadcast({ projectId, canSend }: { projectId: string; canSend: boolean }) {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<Info | null>(null);
  const [text, setText] = useState("");
  const [btnText, setBtnText] = useState("");
  const [btnUrl, setBtnUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const load = useCallback(() => api<Info>(`/api/projects/${projectId}/broadcast`).then(setInfo).catch((e) => setErr(e.message)), [projectId]);
  useEffect(() => {
    if (!open) return;
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [open, load]);

  async function send() {
    if (!window.confirm(`Xabar ${info?.audience ?? 0} ta foydalanuvchiga yuboriladi. Qaytarib bo'lmaydi. Davom etamizmi?`)) return;
    setBusy(true);
    setErr("");
    try {
      await api(`/api/projects/${projectId}/broadcast`, { method: "POST", json: { text, buttonText: btnText, buttonUrl: btnUrl } });
      setText("");
      setBtnText("");
      setBtnUrl("");
      await load();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const running = info?.items.some((i) => i.status === "running");

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn" title="Botdan foydalangan hammaga xabar yuborish">
        <PaperPlaneTilt /> Xabar yuborish
      </button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="card scroll-thin max-h-[90vh] w-full max-w-lg overflow-auto p-5 shadow-[var(--shadow)]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center">
              <h2 className="text-lg font-semibold">Ommaviy xabar</h2>
              <button className="btn btn-sm ml-auto" onClick={() => setOpen(false)} aria-label="Yopish">
                <X />
              </button>
            </div>
            <p className="mb-4 text-sm text-muted">
              Qabul qiluvchilar: <b className="text-fg">{info?.audience ?? "…"}</b> ta foydalanuvchi (botni yoki ilovani ochganlar, botni bloklaganlarsiz).
              Kuniga {info?.maxPerDay ?? 3} tagacha yuborish mumkin.
            </p>
            {canSend ? (
              <div className="space-y-3">
                <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} maxLength={3500} placeholder="Xabar matni" className={inputCls} />
                <div className="grid grid-cols-2 gap-2">
                  <input value={btnText} onChange={(e) => setBtnText(e.target.value)} placeholder="Tugma matni (ixtiyoriy)" className={inputCls} />
                  <input value={btnUrl} onChange={(e) => setBtnUrl(e.target.value)} placeholder="https://…" className={inputCls} />
                </div>
                {err && <p className="text-sm text-danger">{err}</p>}
                <button disabled={busy || running || !text.trim()} onClick={send} className="btn btn-primary w-full">
                  <PaperPlaneTilt weight="fill" /> {running ? "Oldingisi yuborilmoqda…" : busy ? "Boshlanmoqda…" : "Yuborish"}
                </button>
              </div>
            ) : (
              <p className="text-sm text-warn">Yuborish uchun tahrirlash huquqi kerak.</p>
            )}
            {!!info?.items.length && (
              <div className="mt-5 space-y-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted">Oxirgi yuborishlar</h3>
                {info.items.map((i) => {
                  const done = i.sent + i.failed + i.blocked;
                  return (
                    <div key={i.id} className="rounded-lg border border-line p-3 text-sm">
                      <p className="line-clamp-2">{i.text}</p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-panel-2">
                        <div className="h-full bg-accent transition-all" style={{ width: `${Math.min(100, (done / Math.max(1, i.total)) * 100)}%` }} />
                      </div>
                      <p className="mt-1.5 text-xs text-muted">
                        {i.status === "running" ? "Yuborilmoqda" : i.status === "done" ? "Tugadi" : "Xato"} · {i.sent}/{i.total} yetkazildi
                        {i.blocked ? ` · ${i.blocked} bloklagan` : ""}
                        {i.failed ? ` · ${i.failed} xato` : ""} · {timeAgo(i.createdAt)} · {i.by}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
