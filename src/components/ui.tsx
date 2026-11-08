"use client";
import { shownEmail } from "@/lib/display";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { motion } from "motion/react";
import { Coins, PaperPlaneTilt, SignOut, Translate } from "@phosphor-icons/react";
import { api } from "@/lib/client";
import { fmt } from "@/i18n/app";
import { LOCALES, LOCALE_LABEL } from "@/i18n/config";
import { useLocale, useSetLocale, useT } from "@/i18n/client";
import { authClient } from "@/lib/auth-client";
import type { ProjectDTO } from "@/lib/types";

type NavProject = Pick<ProjectDTO, "permissions" | "suspended"> & { ownerEmail?: string | null };

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div
      className="grid shrink-0 place-items-center rounded-lg bg-gradient-to-br from-accent to-pur text-white"
      style={{ width: size, height: size }}
    >
      <PaperPlaneTilt weight="fill" size={size * 0.58} />
    </div>
  );
}

/** Project toolbar under the shell's top bar: project name, page actions and the admin/suspension banners. */
export function ProjectNav({
  name,
  right,
  project,
}: {
  id?: string;
  name?: string;
  right?: React.ReactNode;
  project?: NavProject | null;
}) {
  const t = useT();
  return (
    <>
      <div className="flex h-11 shrink-0 items-center gap-3 border-b border-line bg-panel px-4">
        <span className="max-w-28 shrink-0 truncate text-sm font-semibold sm:max-w-64">{name || "…"}</span>
        <div className="scroll-thin ml-auto flex min-w-0 items-center gap-2 overflow-x-auto">{right}</div>
      </div>
      {project?.permissions.viaAdmin && (
        <div className="shrink-0 bg-warn/15 px-4 py-1.5 text-center text-xs text-warn">
          {fmt(t.banner.admin, { email: shownEmail(project.ownerEmail) || t.banner.owner })}
        </div>
      )}
      {project?.suspended && (
        <div className="shrink-0 bg-danger/15 px-4 py-1.5 text-center text-xs text-danger">{t.banner.suspended}</div>
      )}
    </>
  );
}

export interface Me {
  id: string;
  email: string;
  name: string;
  image?: string | null;
  isAdmin: boolean;
  /** Credit balance; null for platform admins (not metered). */
  credits?: number | null;
}

let meCache: Promise<Me | null> | null = null;
/** The signed-in user, fetched once per page load and shared by every consumer. */
export function useMe() {
  const [me, setMe] = useState<Me | null>(null);
  useEffect(() => {
    meCache ??= api<Me>("/api/me").catch(() => null);
    meCache.then(setMe);
  }, []);
  return me;
}

/** Avatar + email + sign out. */
export function UserMenu({ me }: { me: Me }) {
  const router = useRouter();
  const t = useT();
  // accounts made from Telegram alone have a placeholder email: show the name instead
  const label = me.email.endsWith("@telegram.invalid") ? me.name : me.email; // placeholder email is never shown
  async function signOut() {
    meCache = null;
    await authClient.signOut();
    router.replace("/login");
  }
  const [credits, setCredits] = useState<number | null>(me.credits ?? null);
  useEffect(() => {
    const refresh = () => api<{ credits: number | null }>("/api/me/credits").then((r) => setCredits(r.credits)).catch(() => {});
    window.addEventListener("ms:credits", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("ms:credits", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  return (
    <div className="flex items-center gap-2 text-sm">
      {credits !== null && (
        <Link href="/billing" title={t.billing.chipTitle} className={`btn btn-sm ${credits <= 0 ? "text-danger" : ""}`}>
          <Coins size={14} weight="fill" /> {credits <= 0 ? t.billing.empty : formatCredits(credits)}
        </Link>
      )}
      {me.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={me.image} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
      ) : (
        <span className="grid h-6 w-6 place-items-center rounded-full bg-panel-2 text-xs">{label[0]?.toUpperCase()}</span>
      )}
      <span className="hidden max-w-44 truncate text-muted lg:block">{label}</span>
      <button onClick={signOut} className="btn btn-sm" title={label}>
        <SignOut size={14} />
        <span className="hidden sm:inline">{t.nav.signOut}</span>
      </button>
    </div>
  );
}

/** Four-language switcher: an iOS-style segmented control whose thumb glides to the chosen language on a spring. */
export function LangSwitch({ className = "" }: { className?: string }) {
  const locale = useLocale();
  const setLocale = useSetLocale();
  const thumb = useId();
  return (
    <div className={`flex items-center rounded-md border border-line bg-bg p-0.5 text-xs ${className}`} role="group" aria-label="Language">
      <Translate size={13} className="mx-1.5 text-muted" />
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          title={LOCALE_LABEL[l].name}
          aria-pressed={l === locale}
          className={`relative rounded px-1.5 py-0.5 font-medium transition-colors active:scale-95 ${l === locale ? "text-fg" : "text-muted hover:text-fg"}`}
        >
          {l === locale && <motion.span layoutId={thumb} className="absolute inset-0 rounded bg-panel-2" transition={{ type: "spring", bounce: 0, duration: 0.3 }} />}
          <span className="relative">{LOCALE_LABEL[l].short}</span>
        </button>
      ))}
    </div>
  );
}

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted/80">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-md border border-line bg-bg px-3 py-1.5 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/25";

/** Credits are shown whole when they are whole, otherwise with one decimal. */
export const formatCredits = (c: number) => (Number.isInteger(c) ? String(c) : c.toFixed(1));
