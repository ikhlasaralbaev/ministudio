"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle, CircleNotch, Robot, TelegramLogo } from "@phosphor-icons/react";
import { api } from "@/lib/client";

interface TgState {
  linked: { id: number; username: string; name: string } | null;
  enabled: boolean;
}
interface CreateState {
  enabled: boolean;
  hasBot: boolean;
  botUsername: string | null;
  ownerReady?: boolean;
  ownerLink?: string | null;
  claim: { status: "pending" | "done"; createdAt: string; botUsername: string | null } | null;
}

function StepRow({ n, done, active, title, sub }: { n: number; done: boolean; active: boolean; title: string; sub?: string }) {
  return (
    <li className={`flex items-center gap-3 ${!done && !active ? "opacity-50" : ""}`}>
      <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${done ? "bg-ok/15 text-ok" : "bg-accent/15 text-accent-2"}`}>
        {done ? <CheckCircle weight="fill" size={16} /> : n}
      </span>
      <span className="min-w-0 flex-1 truncate">
        {title}
        {sub && <span className="ml-1.5 text-muted">{sub}</span>}
      </span>
    </li>
  );
}

/**
 * Create the project's Telegram bot from the platform. Step 1: link your Telegram account (so the platform knows who
 * you are in Telegram). Step 2: one tap opens Telegram's "create bot" screen; after you confirm, the platform receives
 * the bot's token itself.
 */
export function BotCreator({ projectId, onConnected, onOwnerId }: { projectId: string; onConnected: () => void; onOwnerId?: (id: number) => void }) {
  const [tg, setTg] = useState<TgState | null>(null);
  const [st, setSt] = useState<CreateState | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const started = useRef(0);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([api<TgState>("/api/me/telegram"), api<CreateState>(`/api/projects/${projectId}/bot/create`)]);
    setTg(a);
    setSt(b);
    return b;
  }, [projectId]);
  useEffect(() => {
    load().catch((e) => setErr(e.message));
  }, [load]);

  // while the user confirms in Telegram, wait for the platform to receive the bot
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(async () => {
      try {
        const b = await load();
        if (b.hasBot) {
          setWaiting(false);
          onConnected();
        } else if (Date.now() - started.current > 5 * 60_000) setWaiting(false);
      } catch {
        /* keep waiting */
      }
    }, 3000);
    return () => clearInterval(t);
  }, [waiting, load, onConnected]);

  // Linking: open the manager bot (Start + "Ha, ulash" there), then wait for the platform to see the link.
  const [linking, setLinking] = useState(false);
  const linkStarted = useRef(0);
  useEffect(() => {
    if (!linking) return;
    const t = setInterval(async () => {
      try {
        const a = await api<TgState>("/api/me/telegram");
        if (a.linked) {
          setTg(a);
          setLinking(false);
        } else if (Date.now() - linkStarted.current > 10 * 60_000) setLinking(false);
      } catch {
        /* keep waiting */
      }
    }, 2000);
    return () => clearInterval(t);
  }, [linking]);

  async function startLink() {
    setErr("");
    try {
      const r = await api<{ link: string }>("/api/me/telegram", { method: "POST" });
      linkStarted.current = Date.now();
      setLinking(true);
      window.open(r.link, "_blank", "noopener");
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  async function create() {
    setBusy(true);
    setErr("");
    try {
      const r = await api<{ link: string }>(`/api/projects/${projectId}/bot/create`, { method: "POST" });
      started.current = Date.now();
      setWaiting(true);
      window.open(r.link, "_blank", "noopener");
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (err && (!tg || !st)) return <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">Yuklanmadi: {err}</p>;
  if (!tg || !st || !st.enabled) return null;
  if (st.hasBot) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-panel-2 p-3 text-sm">
        <CheckCircle weight="fill" size={20} className="shrink-0 text-ok" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            Bot ulandi{" "}
            {st.botUsername && (
              <a className="text-accent-2 hover:underline" target="_blank" rel="noreferrer" href={`https://t.me/${st.botUsername}`}>
                @{st.botUsername}
              </a>
            )}
          </p>
          {!st.ownerReady && st.ownerLink && <p className="text-xs text-muted">Buyurtmalar kelishi uchun botda Start bosing</p>}
        </div>
        {!st.ownerReady && st.ownerLink && (
          <a href={st.ownerLink} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
            <TelegramLogo weight="fill" /> Start
          </a>
        )}
      </div>
    );
  }

  const waitingNow = linking || waiting;
  const step = !tg.linked ? 1 : 2;
  return (
    <div className="space-y-4 rounded-xl border border-line bg-panel-2 p-4 text-sm">
      <div className="flex items-center gap-2 font-medium">
        <Robot weight="fill" size={18} className="text-accent-2" /> Telegram bot yaratish
      </div>
      <ol className="space-y-2.5">
        <StepRow n={1} active={step === 1} done={!!tg.linked} title={tg.linked ? "Telegram ulangan" : "Telegramni ulash"} sub={tg.linked ? tg.linked.name || (tg.linked.username ? `@${tg.linked.username}` : "") : undefined} />
        <StepRow n={2} active={step === 2} done={false} title="Bot yaratish" />
      </ol>
      <button type="button" className="btn btn-primary w-full justify-center" disabled={busy || waitingNow} onClick={step === 1 ? startLink : create}>
        {waitingNow ? <CircleNotch size={16} className="animate-spin" /> : step === 1 ? <TelegramLogo weight="fill" /> : <Robot weight="fill" />}
        {waitingNow ? "Telegramda tasdiqlang…" : step === 1 ? "Telegramni ulash" : "Bot yaratish"}
      </button>
      {waitingNow && <p className="text-center text-xs text-muted">{step === 1 ? "Start, so‘ng «Ha, ulash» ni bosing" : "«Yaratish» ni bosing"}</p>}
      {err && <p className="text-danger">{err}</p>}
      {onOwnerId && tg.linked && (
        <button type="button" className="text-xs text-muted hover:text-fg" onClick={() => onOwnerId(tg.linked!.id)}>
          Buyurtmalar shu Telegramga kelsin
        </button>
      )}
    </div>
  );
}
