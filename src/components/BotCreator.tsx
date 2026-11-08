"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle, LinkBreak, Robot, TelegramLogo } from "@phosphor-icons/react";
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

  if (err && (!tg || !st)) return <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger">Bot yaratish bo&apos;limi yuklanmadi: {err}</p>;
  if (!tg || !st || !st.enabled) return null;
  if (st.hasBot) {
    return (
      <div className="space-y-2 rounded-lg border border-ok/40 bg-ok/10 p-3 text-sm">
        <p className="flex items-center gap-2 text-ok">
          <CheckCircle weight="fill" size={18} /> Bot ulangan{st.botUsername ? <a className="font-medium underline" target="_blank" href={`https://t.me/${st.botUsername}`}>@{st.botUsername}</a> : null}
        </p>
        {!st.ownerReady && st.ownerLink && (
          <>
            <p className="text-muted">Buyurtma xabarlari sizga kelishi uchun botda bir marta <b className="text-fg">Start</b> bosing:</p>
            <a href={st.ownerLink} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
              <TelegramLogo weight="fill" /> Buyurtmalarni olish (Start)
            </a>
          </>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-3 rounded-lg border border-accent/40 bg-accent/10 p-4 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <Robot weight="fill" size={18} className="text-accent-2" /> Botni platformaning o&apos;zidan yarating
      </p>
      <p className="text-muted">BotFather&apos;ga kirish va token ko&apos;chirish shart emas. Telegramda bir marta tasdiqlaysiz, token o&apos;zi ulanadi.</p>
      {!tg.linked ? (
        <div className="space-y-2">
          <p>1. Telegram akkauntingizni ulang (platforma sizni Telegramda tanishi uchun):</p>
          <button type="button" className="btn btn-primary" disabled={linking} onClick={startLink}>
            <TelegramLogo weight="fill" /> {linking ? "Telegramda tasdiqlashni kutyapman…" : "Telegramni ulash"}
          </button>
          {linking && <p className="text-xs text-muted">Ochilgan Telegram oynasida <b>Start</b> bosing, so&apos;ng «Ha, ulash» tugmasini bosing. Bu yerda o&apos;zi yangilanadi.</p>}
        </div>
      ) : (
        <div className="space-y-2.5">
          <p className="flex flex-wrap items-center gap-2 text-muted">
            <TelegramLogo weight="fill" className="text-accent-2" /> Ulangan: <b className="text-fg">{tg.linked.name || tg.linked.username}</b>
            {tg.linked.username && <span>@{tg.linked.username}</span>}
            <button type="button" className="btn btn-sm" onClick={() => api("/api/me/telegram", { method: "DELETE" }).then(load)}>
              <LinkBreak /> Ajratish
            </button>
            {onOwnerId && (
              <button type="button" className="btn btn-sm" onClick={() => onOwnerId(tg.linked!.id)} title="Buyurtma xabarlari shu Telegram'ga boradi (botda bir marta Start bosing)">
                Egasi shu akkaunt
              </button>
            )}
          </p>
          <p>2. Botni yarating:</p>
          <button type="button" className="btn btn-primary" disabled={busy || waiting} onClick={create}>
            <Robot weight="fill" /> {waiting ? "Telegramda tasdiqlashni kutyapman…" : "Bot yaratish"}
          </button>
          {waiting && <p className="text-xs text-muted">Telegram ochilgan oynada «Yaratish»ni bosing. Bot tayyor bo&apos;lgach, bu yerda o&apos;zi paydo bo&apos;ladi (5 daqiqagacha kutiladi).</p>}
        </div>
      )}
      {err && <p className="text-danger">{err}</p>}
      <p className="text-xs text-muted">Yoki BotFather&apos;dan olingan tokenni Sozlamalar sahifasida qo&apos;lda kiriting.</p>
    </div>
  );
}
