"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { Database, Gear, ShieldCheck, SquaresFour, Sparkle } from "@phosphor-icons/react";
import { LangSwitch, Logo, useMe, UserMenu } from "@/components/ui";
import { useT } from "@/i18n/client";

interface Item {
  href: string;
  label: string;
  icon: React.ReactNode;
  match: (p: string) => boolean;
}

/** App shell: top bar, sidebar (icon rail inside the studio) and the content area. */
export function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const me = useMe();
  const t = useT();
  const pid = path.match(/^\/projects\/([^/]+)/)?.[1];
  const rail = !!pid && path.endsWith("/studio");

  const global: Item[] = [
    { href: "/dashboard", label: t.nav.projects, icon: <SquaresFour size={18} />, match: (p) => p === "/dashboard" },
    ...(me?.isAdmin ? [{ href: "/admin", label: t.nav.admin, icon: <ShieldCheck size={18} />, match: (p: string) => p.startsWith("/admin") }] : []),
  ];
  const scoped: Item[] = pid
    ? [
        { href: `/projects/${pid}/studio`, label: t.nav.studio, icon: <Sparkle size={18} />, match: (p) => p.endsWith("/studio") },
        { href: `/projects/${pid}/settings`, label: t.nav.settings, icon: <Gear size={18} />, match: (p) => p.endsWith("/settings") },
        { href: `/projects/${pid}/data`, label: t.nav.data, icon: <Database size={18} />, match: (p) => p.endsWith("/data") },
      ]
    : [];

  const link = (it: Item, compact: boolean) => {
    const on = it.match(path);
    return (
      <Link
        key={it.href}
        href={it.href}
        title={it.label}
        className={`relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors ${on ? "text-fg" : "text-muted hover:text-fg"} ${compact ? "justify-center" : ""}`}
      >
        {on && (
          <motion.span
            layoutId={`nav-on-${compact ? "rail" : "full"}`}
            className="absolute inset-0 rounded-md bg-panel-2"
            transition={{ type: "spring", stiffness: 500, damping: 40 }}
          >
            <span className="absolute -left-2 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent" />
          </motion.span>
        )}
        <span className="relative">{it.icon}</span>
        {!compact && <span className="relative truncate">{it.label}</span>}
      </Link>
    );
  };

  return (
    <div className="flex h-dvh flex-col bg-bg">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-line bg-panel px-3">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <Logo size={26} />
          <span className="hidden sm:inline">MiniStudio</span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <LangSwitch />
          {me && <UserMenu me={me} />}
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside
          className={`scroll-thin flex shrink-0 gap-1 overflow-x-auto border-b border-line bg-panel p-2 md:flex-col md:overflow-visible md:border-b-0 md:border-r ${
            rail ? "md:w-14" : "md:w-56"
          }`}
        >
          {global.map((i) => link(i, rail))}
          {scoped.length > 0 && (
            <>
              {!rail && <span className="mx-2 mt-3 hidden text-[11px] font-semibold uppercase tracking-wide text-muted md:block">{t.nav.project}</span>}
              <span className="mx-1 my-1 hidden border-t border-line md:block" />
              {scoped.map((i) => link(i, rail))}
            </>
          )}
        </aside>
        <div className="min-h-0 min-w-0 flex-1 overflow-auto">{children}</div>
      </div>
    </div>
  );
}
