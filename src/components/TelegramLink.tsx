"use client";
import { useEffect, useRef, useState } from "react";
import { TelegramLogo } from "@phosphor-icons/react";
import { api } from "@/lib/client";
import { useT } from "@/i18n/client";

interface TgState {
  linked: { id: number } | null;
  enabled: boolean;
}

/**
 * Shown to accounts that signed in with Google and have not linked Telegram yet. Without the link, the manager bot
 * and the Mini App open a separate Telegram account that cannot see these projects. Linking merges them.
 */
export function TelegramLink() {
  const t = useT();
  const [st, setSt] = useState<TgState | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [err, setErr] = useState("");
  const startedAt = useRef(0);

  useEffect(() => {
    api<TgState>("/api/me/telegram").then(setSt).catch(() => {});
  }, []);

  useEffect(() => {
    if (!waiting) return;
    const timer = setInterval(async () => {
      try {
        const a = await api<TgState>("/api/me/telegram");
        if (a.linked) {
          setSt(a);
          setWaiting(false);
        } else if (Date.now() - startedAt.current > 10 * 60_000) setWaiting(false);
      } catch {
        /* keep waiting */
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [waiting]);

  async function start() {
    setErr("");
    try {
      const r = await api<{ link: string }>("/api/me/telegram", { method: "POST" });
      startedAt.current = Date.now();
      setWaiting(true);
      window.open(r.link, "_blank", "noopener");
    } catch (e) {
      setErr((e as Error).message);
    }
  }

  if (!st || !st.enabled || st.linked) return null;
  return (
    <div className="mx-auto mb-8 flex max-w-2xl flex-wrap items-center gap-3 rounded-xl border border-line bg-panel p-4 text-sm">
      <TelegramLogo size={22} className="shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="font-medium">{t.tg.title}</p>
        <p className="text-muted">{waiting ? t.tg.waiting : t.tg.hint}</p>
        {err && <p className="text-danger">{err}</p>}
      </div>
      <button type="button" className="btn btn-sm" onClick={start}>
        {t.tg.btn}
      </button>
    </div>
  );
}
