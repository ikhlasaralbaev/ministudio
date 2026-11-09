"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CircleNotch, TelegramLogo } from "@phosphor-icons/react";
import { LangSwitch, Logo } from "@/components/ui";
import { useT } from "@/i18n/client";
import { browserLocale, translateServer } from "@/i18n/server-text";
import { authClient } from "@/lib/auth-client";

function safeNext(v: string | null) {
  // Only same-site paths: never redirect to another origin after login.
  return v && v.startsWith("/") && !v.startsWith("//") ? v : "/dashboard";
}

function LoginInner() {
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const failed = params.get("error");
  const t = useT();

  // Sign in with Telegram: the bot asks "is this you?" and this page waits for the answer (polls with a secret only it has).
  const router = useRouter();
  const [tgBusy, setTgBusy] = useState(false);
  const [tgErr, setTgErr] = useState("");
  const [tgLink, setTgLink] = useState("");
  const pending = useRef<{ code: string; secret: string } | null>(null);
  useEffect(() => {
    if (!tgBusy) return;
    const started = Date.now();
    const timer = setInterval(async () => {
      const p = pending.current;
      if (!p) return;
      try {
        const r = await fetch(`/api/tglogin/${p.code}`, { method: "POST", body: JSON.stringify({ secret: p.secret }) });
        const j = await r.json().catch(() => ({}));
        if (r.ok && j.status === "ok") {
          clearInterval(timer);
          router.replace(safeNext(params.get("next")));
          router.refresh();
        } else if (!r.ok || Date.now() - started > 5 * 60_000) {
          clearInterval(timer);
          setTgBusy(false);
          setTgErr(j.error ? translateServer(browserLocale(), j.error) : t.login.telegramFail);
        }
      } catch {
        /* keep waiting */
      }
    }, 2000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tgBusy]);

  async function tgSignIn() {
    setTgErr("");
    try {
      const r = await fetch("/api/tglogin", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ? translateServer(browserLocale(), j.error) : t.login.telegramFail);
      pending.current = { code: j.code, secret: j.secret };
      setTgLink(j.link);
      setTgBusy(true);
      window.open(j.link, "_blank", "noopener");
    } catch (e) {
      setTgErr((e as Error).message);
    }
  }

  async function signIn() {
    setBusy(true);
    await authClient.signIn.social({
      provider: "google",
      callbackURL: safeNext(params.get("next")),
      errorCallbackURL: "/login?error=1",
    });
  }

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden px-6">
      <div className="pointer-events-none absolute left-1/2 top-[-260px] h-[620px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--pur)_22%,transparent),color-mix(in_srgb,var(--accent)_13%,transparent)_45%,transparent_72%)] blur-xl" />
      <div className="absolute left-4 top-4 flex items-center gap-3">
        <Link href="/" className="btn btn-sm"><ArrowLeft /> {t.login.back}</Link>
      </div>
      <div className="absolute right-4 top-4"><LangSwitch /></div>
      <div className="rise relative w-full max-w-sm rounded-xl border border-line bg-panel p-8 text-center shadow-[var(--shadow)]">
        <div className="mb-4 flex justify-center">
          <Logo size={48} />
        </div>
        <h1 className="text-xl font-semibold tracking-tight">MiniStudio</h1>
        <p className="mb-6 mt-1 text-sm text-muted">{t.tagline}</p>
        {failed && <p className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{t.login.failed}</p>}
        <button
          onClick={signIn}
          disabled={busy}
          className="btn btn-lg w-full gap-3 !bg-white !text-black hover:!bg-white/90"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
            <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
          </svg>
          {busy ? t.login.redirecting : t.login.google}
        </button>
        <button onClick={tgSignIn} disabled={tgBusy} className="btn btn-lg mt-3 w-full gap-3">
          {tgBusy ? <CircleNotch size={18} className="animate-spin" /> : <TelegramLogo size={20} weight="fill" className="text-[#2aabee]" />}
          {t.login.telegram}
        </button>
        {tgBusy && (
          <div className="mt-3 space-y-1.5 text-xs text-muted">
            <p>{t.login.telegramWait}</p>
            {/* a blocked pop-up (common on phones) must not leave the person stuck: the same link is right here */}
            <a href={tgLink} target="_blank" rel="noreferrer" className="text-accent-2 hover:underline">
              {t.login.telegramOpen}
            </a>
          </div>
        )}
        {tgErr && <p className="mt-3 text-sm text-danger">{tgErr}</p>}
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  );
}
