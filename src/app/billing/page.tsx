"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, Coins } from "@phosphor-icons/react";
import { api, timeAgo } from "@/lib/client";
import { formatCredits } from "@/components/ui";
import { useT } from "@/i18n/client";

interface Row {
  credits: number;
  reason: "grant" | "ai" | "topup" | "admin";
  note: string | null;
  balance: number;
  at: string;
}
interface Resp {
  unmetered: boolean;
  credits: number | null;
  history: Row[];
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
