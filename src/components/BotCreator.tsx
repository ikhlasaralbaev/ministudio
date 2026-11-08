"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { CheckCircle, LinkBreak, Robot, TelegramLogo } from "@phosphor-icons/react";
import { api } from "@/lib/client";

interface TgState {
  linked: { id: number; username: string; name: string } | null;
  loginBot: string | null;
  enabled: boolean;
}
interface CreateState {
  enabled: boolean;
  hasBot: boolean;
  botUsername: string | null;
  claim: { status: "pending" | "done"; createdAt: string; botUsername: string | null } | null;
}
type TgAuth = Record<string, string | number>;
declare global {
  interface Window {
    onMiniStudioTelegramAuth?: (u: TgAuth) => void;
  }
}

/** Telegram's own "Log in with Telegram" button (it only works on the domain registered for the bot in BotFather). */
function TelegramLoginButton({ bot, onAuth }: { bot: string; onAuth: (u: TgAuth) => void }) {
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    window.onMiniStudioTelegramAuth = onAuth;
    const el = box.current;
    if (!el) return;
    el.innerHTML = "";
    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.async = true;
    s.setAttribute("data-telegram-login", bot);
    s.setAttribute("data-size", "large");
    s.setAttribute("data-radius", "6");
    s.setAttribute("data-userpic", "false");
    s.setAttribute("data-onauth", "onMiniStudioTelegramAuth(user)");
    el.appendChild(s);
    return () => {
      delete window.onMiniStudioTelegramAuth;
    };
  }, [bot, onAuth]);
  return <div ref={box} className="min-h-10" />;
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

  const link = useCallback(
    async (u: TgAuth) => {
      setErr("");
      try {
        await api("/api/me/telegram", { method: "POST", json: u });
        await load();
      } catch (e) {
        setErr((e as Error).message);
      }
    },
    [load],
  );

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

  if (!tg || !st || !st.enabled) return null;
  if (st.hasBot) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-ok/40 bg-ok/10 p-3 text-sm text-ok">
        <CheckCircle weight="fill" size={18} /> Bot ulangan{st.botUsername ? <a className="font-medium underline" target="_blank" href={`https://t.me/${st.botUsername}`}>@{st.botUsername}</a> : null}
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
          {tg.loginBot && <TelegramLoginButton bot={tg.loginBot} onAuth={link} />}
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
      <p className="text-xs text-muted">Yoki pastdagi maydonga BotFather&apos;dan olingan tokenni qo&apos;lda kiriting.</p>
    </div>
  );
}
