"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { X } from "@phosphor-icons/react";
import { api } from "@/lib/client";
import { GROUPS, TEMPLATES, buildTemplate, type TemplateGroup, type TemplateMeta } from "@/lib/gallery";
import { SPRING } from "@/lib/springs";
import { useLocale, useX } from "@/i18n/client";
import { FRAME_H, PhoneFrame } from "@/components/studio/PhoneFrame";
import { TemplateLive, TemplateThumb } from "./TemplatePreview";

/** The template page: every template as a live preview, a filter by kind, and a larger working preview with a start button. */
export function TemplatesBrowser() {
  const x = useX();
  const locale = useLocale();
  const router = useRouter();
  const [group, setGroup] = useState<TemplateGroup | "all">("all");
  const [open, setOpen] = useState<TemplateMeta | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const shown = TEMPLATES.filter((t) => group === "all" || t.group === group);
  const docs = useMemo(() => new Map(TEMPLATES.map((t) => [t.id, buildTemplate(t.id)!])), []);

  async function start(id: string) {
    if (busy) return;
    setBusy(true);
    setErr("");
    try {
      const r = await api<{ _id: string }>("/api/projects", { method: "POST", json: { template: id } });
      router.push(`/projects/${r._id}/studio`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">{x("Tayyor shablonlar")}</h1>
      <p className="mt-1 max-w-2xl text-sm text-muted">{x("Shablonni oching, ilovani sinab ko'ring va bir bosishda o'zingizniki qiling. Keyin hammasini AI bilan o'zgartirasiz.")}</p>

      <div className="seg mt-5 flex-wrap" role="group">
        {[{ id: "all" as const, label: x("Hammasi") }, ...GROUPS.map((g) => ({ id: g.id, label: g.label[locale] }))].map((g) => (
          <button key={g.id} type="button" aria-pressed={group === g.id} onClick={() => setGroup(g.id)} className="seg-item">
            {g.label}
          </button>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {shown.map((t) => (
          // a div, not a button: the live preview inside has real buttons of its own
          <div
            key={t.id}
            role="button"
            tabIndex={0}
            onClick={() => setOpen(t)}
            onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setOpen(t))}
            className="card press cursor-pointer overflow-hidden p-0 text-left"
          >
            <TemplateThumb doc={docs.get(t.id)!} />
            <div className="border-t border-line p-3">
              <p className="text-sm font-medium">{t.label[locale]}</p>
              <p className="mt-0.5 text-xs text-muted">{t.hint[locale]}</p>
            </div>
          </div>
        ))}
      </div>
      {err && !open && <p className="mt-3 text-sm text-danger">{err}</p>}

      <AnimatePresence>
        {open && <Detail key={open.id} tpl={open} doc={docs.get(open.id)!} busy={busy} err={err} onClose={() => !busy && setOpen(null)} onStart={() => void start(open.id)} />}
      </AnimatePresence>
    </div>
  );
}

function Detail({ tpl, doc, busy, err, onClose, onStart }: { tpl: TemplateMeta; doc: ReturnType<typeof buildTemplate> & object; busy: boolean; err: string; onClose: () => void; onStart: () => void }) {
  const x = useX();
  const locale = useLocale();
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const fit = () => setZoom(Math.max(0.45, Math.min(1, (window.innerHeight - 56) / FRAME_H)));
    fit();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("resize", fit);
    window.addEventListener("keydown", esc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("resize", fit);
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-[90] flex items-center justify-center overflow-auto bg-black/60 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div
        role="dialog"
        aria-label={tpl.label[locale]}
        className="flex max-h-full w-full max-w-3xl flex-col items-center gap-6 md:flex-row md:justify-center"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97 }}
        transition={SPRING.smooth}
      >
        <div style={{ zoom }} className="shrink-0">
          <PhoneFrame title={doc.name} theme={doc.theme}>
            <TemplateLive doc={doc} />
          </PhoneFrame>
        </div>
        <div className="glass w-full max-w-xs rounded-3xl p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">{tpl.label[locale]}</h2>
              <p className="mt-1 text-sm text-muted">{tpl.hint[locale]}</p>
            </div>
            <button type="button" onClick={onClose} className="btn btn-sm" aria-label={x("Yopish")}>
              <X size={14} />
            </button>
          </div>
          <p className="mt-4 text-xs text-muted">{x("Chapdagi ilova ishlaydi: menyuni varaqlang, savatga qo'shing, formani to'ldiring. Hech narsa saqlanmaydi.")}</p>
          <button type="button" onClick={onStart} disabled={busy} className="btn btn-primary mt-5 w-full justify-center">
            {busy ? x("Yaratilmoqda…") : x("Shu shablondan boshlash")}
          </button>
          {err && <p className="mt-2 text-sm text-danger">{err}</p>}
        </div>
      </motion.div>
    </motion.div>
  );
}
