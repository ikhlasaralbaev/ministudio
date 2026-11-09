"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Coins, Copy, UsersThree } from "@phosphor-icons/react";
import { api, timeAgo } from "@/lib/client";
import { formatCredits } from "@/components/ui";
import { useT, useX } from "@/i18n/client";

interface Row {
  credits: number;
  reason: "grant" | "ai" | "topup" | "admin" | "referral";
  note: string | null;
  balance: number;
  at: string;
}
interface Resp {
  unmetered: boolean;
  credits: number | null;
  history: Row[];
}

interface Ref {
  code: string;
  invited: number;
  credits: number;
  reward: number;
}

/** Share a link: every friend who signs up through it brings credits. */
function Referral() {
  const x = useX();
  const [r, setR] = useState<Ref | null>(null);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    api<Ref>("/api/me/referral").then(setR).catch(() => {});
  }, []);
  if (!r || !r.reward) return null;
  const link = `${window.location.origin}/?ref=${r.code}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
    } catch {
      const el = document.getElementById("ref-link") as HTMLInputElement | null;
      el?.select();
      document.execCommand("copy");
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <section className="card p-5">
      <h2 className="mb-1 flex items-center gap-2 font-semibold">
        <UsersThree weight="duotone" className="text-accent" size={20} /> {x("Do'stlaringizni taklif qiling")}
      </h2>
      <p className="text-sm text-muted">{x("Havolangiz orqali ro'yxatdan o'tgan har bir do'st uchun {n} kredit olasiz.", { n: r.reward })}</p>
      <div className="mt-3 flex gap-2">
        <input id="ref-link" readOnly value={link} onFocus={(e) => e.currentTarget.select()} className="input min-w-0 flex-1 font-mono text-xs" />
        <button type="button" onClick={() => void copy()} className="btn btn-sm shrink-0">
          {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? x("Nusxalandi") : x("Nusxalash")}
        </button>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-xl border border-line p-3">
          <p className="text-muted">{x("Taklif qilinganlar")}</p>
          <p className="mt-0.5 text-xl font-semibold">{r.invited}</p>
        </div>
        <div className="rounded-xl border border-line p-3">
          <p className="text-muted">{x("Olingan kredit")}</p>
          <p className="mt-0.5 text-xl font-semibold">{formatCredits(r.credits)}</p>
        </div>
      </div>
    </section>
  );
}

export default function BillingPage() {
  const t = useT();
  const [d, setD] = useState<Resp | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    api<Resp>("/api/me/credits").then(setD).catch((e) => setErr(e.message));
  }, []);
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      <Link href="/dashboard" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft size={14} /> {t.billing.back}
      </Link>
      <h1 className="mb-5 text-2xl font-semibold tracking-tight">{t.billing.title}</h1>
      {err && <p className="text-danger">{err}</p>}
      {!d && !err && <div className="ms-skeleton h-32 rounded-xl border border-line" />}
      {d && (
        <div className="space-y-6">
          <section className="card p-5">
            <p className="text-sm text-muted">{t.billing.balance}</p>
            {d.unmetered ? (
              <p className="mt-1 text-sm">{t.billing.unmetered}</p>
            ) : (
              <p className={`mt-1 flex items-center gap-2 text-4xl font-semibold ${(d.credits ?? 0) <= 0 ? "text-danger" : ""}`}>
                <Coins weight="fill" className="text-accent" size={32} /> {formatCredits(d.credits ?? 0)} <span className="text-base font-normal text-muted">{t.billing.unit}</span>
              </p>
            )}
            <p className="mt-3 text-sm text-muted">{t.billing.how}</p>
          </section>

          {!d.unmetered && <Referral />}

          <section className="card p-5">
            <h2 className="mb-1 font-semibold">{t.billing.topupTitle}</h2>
            <p className="text-sm text-muted">{t.billing.topupSoon}</p>
          </section>

          {!d.unmetered && (
            <section>
              <h2 className="mb-2 font-semibold">{t.billing.history}</h2>
              {d.history.length === 0 ? (
                <p className="text-sm text-muted">{t.billing.noHistory}</p>
              ) : (
                <ul className="divide-y divide-line card">
                  {d.history.map((r, i) => (
                    <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{t.billing.reasons[r.reason]}</span>
                        <span className="block truncate text-xs text-muted">{r.note ? `${r.note} · ` : ""}{timeAgo(r.at)}</span>
                      </span>
                      <span className={`font-mono ${r.credits < 0 ? "text-muted" : "text-ok"}`}>{r.credits > 0 ? "+" : ""}{formatCredits(r.credits)}</span>
                      <span className="w-14 text-right font-mono text-xs text-muted">{formatCredits(r.balance)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>
      )}
    </main>
  );
}
