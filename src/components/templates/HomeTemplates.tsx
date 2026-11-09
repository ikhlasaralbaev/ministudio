"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight } from "@phosphor-icons/react";
import { TEMPLATES, buildTemplate } from "@/lib/gallery";
import { useLocale, useX } from "@/i18n/client";
import { TemplateThumb } from "./TemplatePreview";

/** Landing page section: a live look at the templates; a card opens it in the gallery, where it can be tried and started. */
export function HomeTemplates() {
  const x = useX();
  const locale = useLocale();
  const router = useRouter();
  const docs = useMemo(() => new Map(TEMPLATES.map((t) => [t.id, buildTemplate(t.id, locale)!])), [locale]);
  return (
    <section id="templates">
      <div className="w">
        <h2>{x("Tayyor shablonlar")}</h2>
        <p className="lead">{x("Shablonni oching, ilovani sinab ko'ring va bir bosishda o'zingizniki qiling. Keyin hammasini AI bilan o'zgartirasiz.")}</p>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {TEMPLATES.slice(0, 8).map((t) => (
            <div
              key={t.id}
              role="link"
              tabIndex={0}
              onClick={() => router.push(`/templates?open=${t.id}`)}
              onKeyDown={(e) => e.key === "Enter" && router.push(`/templates?open=${t.id}`)}
              className="cursor-pointer overflow-hidden rounded-[10px] border border-line bg-panel transition-transform hover:-translate-y-0.5"
            >
              <TemplateThumb doc={docs.get(t.id)!} />
              <div className="border-t border-line p-3">
                <p className="text-sm font-medium">{t.label[locale]}</p>
                <p className="mt-0.5 text-xs text-muted">{t.hint[locale]}</p>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 28 }}>
          <Link className="btn lg" href="/templates">
            {x("Barcha shablonlar")} ({TEMPLATES.length})
            <ArrowRight weight="bold" />
          </Link>
        </div>
      </div>
    </section>
  );
}
