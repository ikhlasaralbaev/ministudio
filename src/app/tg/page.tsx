"use client";
import Script from "next/script";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { IkatLoader } from "@/components/IkatLoader";
import { Logo } from "@/components/ui";
import { useX } from "@/i18n/client";

interface TgWebApp {
  initData: string;
  ready: () => void;
  expand: () => void;
}

// Same-site paths only: never redirect somewhere else after signing in.
const safeNext = (v: string | null) => (v && v.startsWith("/") && !v.startsWith("//") ? v : "/dashboard");

function Inner() {
  const x = useX();
  const next = safeNext(useSearchParams().get("next"));
  const [err, setErr] = useState("");
  const [ready, setReady] = useState(false);

  const enter = useCallback(async () => {
    const wa = (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;
    if (!wa?.initData) {
      setErr(x("Bu sahifa Telegram ichida ochilishi kerak: manager botdagi «Panel» tugmasidan foydalaning."));
      return;
    }
    wa.ready();
    wa.expand();
    try {
      const r = await fetch("/api/tg/signin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ initData: wa.initData }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
      window.location.replace(next);
    } catch (e) {
      setErr((e as Error).message);
    }
  }, [next, x]);

  useEffect(() => {
    if (ready) void enter();
  }, [ready, enter]);

  return (
    <main className="grid min-h-dvh place-items-center px-6 text-center">
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" onReady={() => setReady(true)} />
      <div className="max-w-sm space-y-4">
        <div className="flex justify-center"><Logo size={48} /></div>
        {err ? (
          <>
            <p className="text-sm text-danger">{err}</p>
            <a href="/login" className="btn">{x("Sayt orqali kirish")}</a>
          </>
        ) : (
          <IkatLoader size={30} label={x("Kirilmoqda…")} />
        )}
      </div>
    </main>
  );
}

export default function TgEntry() {
  return (
    <Suspense>
      <Inner />
    </Suspense>
  );
}
