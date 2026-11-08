"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Cake, Coffee, FlowerTulip, GraduationCap, Scissors, Sparkle, TShirt, Wrench } from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import { api } from "@/lib/client";
import { TEMPLATES } from "@/lib/gallery";
import { useLocale, useT } from "@/i18n/client";

const ICONS: Record<string, Icon> = { Coffee, FlowerTulip, TShirt, Cake, Scissors, GraduationCap, Wrench, Sparkle };

/** Ready-made starting points on the dashboard: one tap creates the project (no AI cost) and opens the studio. */
export function TemplateGallery() {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState("");

  async function pick(id: string) {
    if (busy) return;
    setBusy(id);
    setErr("");
    try {
      const r = await api<{ _id: string }>("/api/projects", { method: "POST", json: { template: id } });
      router.push(`/projects/${r._id}/studio`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(null);
    }
  }

  return (
    <section className="mx-auto mb-8 max-w-4xl">
      <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-muted">{t.dash.templates}</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TEMPLATES.map((tpl) => {
          const Ico = ICONS[tpl.icon] ?? Sparkle;
          return (
            <button
              key={tpl.id}
              type="button"
              disabled={!!busy}
              onClick={() => void pick(tpl.id)}
              className="card flex flex-col items-start gap-1.5 p-3 text-left transition hover:border-muted disabled:opacity-60"
            >
              <Ico size={22} weight="duotone" className="text-accent" />
              <span className="text-sm font-medium">{tpl.label[locale]}</span>
              <span className="text-xs text-muted">{busy === tpl.id ? t.dash.ideaCreating : tpl.hint[locale]}</span>
            </button>
          );
        })}
      </div>
      {err && <p className="mt-2 text-center text-sm text-danger">{err}</p>}
    </section>
  );
}
