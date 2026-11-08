"use client";
import { useEffect, useState } from "react";
import { Sparkle } from "@phosphor-icons/react";
import { useT } from "@/i18n/client";

const STEP_MS = 3300;

/**
 * The "your app is being built" screen: a living orb and status lines that change as the AI works
 * (thinking, establishing screens, cooking logic...). The last line stays while a long job finishes.
 * `fullscreen` covers the whole window (used right after pressing Create, before Studio is even open).
 */
export function BuildingScreen({ fullscreen = false }: { fullscreen?: boolean }) {
  const t = useT();
  const [i, setI] = useState(0);
  const [sec, setSec] = useState(0);
  const phrases = t.build.phrases;

  useEffect(() => {
    const a = setInterval(() => setI((x) => Math.min(x + 1, phrases.length - 1)), STEP_MS);
    const b = setInterval(() => setSec((x) => x + 1), 1000);
    return () => {
      clearInterval(a);
      clearInterval(b);
    };
  }, [phrases.length]);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`canvas-dots grid place-items-center overflow-hidden p-6 text-center ${fullscreen ? "fixed inset-0 z-50 bg-bg" : "min-h-0 flex-1"}`}
    >
      <div className="relative flex max-w-md flex-col items-center">
        <div className="build-glow" aria-hidden />
        <div className="build-orb mb-8">
          <Sparkle weight="fill" size={30} className="ai-spark relative z-10 text-white" />
        </div>
        <h2 className="mb-2 text-xl font-semibold tracking-tight">{t.build.title}</h2>
        <p key={i} className="build-phrase h-7 bg-gradient-to-r from-accent-2 to-pur bg-clip-text text-[17px] font-medium text-transparent">
          {phrases[i]}
        </p>
        <div className="ai-bar mt-6 w-56 rounded-full" />
        <p className="mt-4 text-xs text-muted">
          {t.build.hint} · <span className="tabular-nums">{Math.floor(sec / 60)}:{String(sec % 60).padStart(2, "0")}</span>
        </p>
      </div>
    </div>
  );
}
