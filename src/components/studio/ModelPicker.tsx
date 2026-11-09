"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { api } from "@/lib/client";
import { SPRING } from "@/lib/springs";
import { AI_MODELS, resolveModel } from "@/lib/models";
import { useX } from "@/i18n/client";

/** Claude model used for this project's generation and edits. Saved on the project. */
export function ModelPicker({
  projectId,
  value,
  onChange,
  onError,
}: {
  projectId: string;
  value: string | null;
  onChange: (id: string) => void;
  onError: (msg: string) => void;
}) {
  const x = useX();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const current = AI_MODELS.find((m) => m.id === resolveModel(value))!;

  useEffect(() => {
    if (!open) return;
    // The header scrolls sideways, which would clip a normal dropdown: the menu lives on <body> and is placed from the button.
    const place = () => {
      const r = ref.current?.getBoundingClientRect();
      if (r) setPos({ top: r.bottom + 6, right: Math.max(8, window.innerWidth - r.right) });
    };
    place();
    const close = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!ref.current?.contains(t) && !menu.current?.contains(t)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("mousedown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  async function pick(id: string) {
    setOpen(false);
    if (id === current.id) return;
    const prev = value;
    onChange(id);
    try {
      await api(`/api/projects/${projectId}`, { method: "PATCH", json: { aiModel: id } });
    } catch (e) {
      onChange(prev ?? current.id);
      onError(x("Modelni saqlab bo'lmadi: ") + (e as Error).message);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title={x("AI modeli")}
        className="btn btn-sm gap-1.5"
      >
        <span className="text-accent-2">✦</span>
        {current.label}
        <span className="text-[10px] text-muted">▾</span>
      </button>
      {open && pos && createPortal(
        <motion.div
          ref={menu}
          style={{ top: pos.top, right: pos.right }}
          className="glass fixed z-[100] w-72 max-w-[calc(100vw-16px)] origin-top-right overflow-hidden rounded-2xl p-1.5 shadow-[var(--shadow)]"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={SPRING.snappy}
        >
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">{x("Claude modeli")}</p>
          {AI_MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => !m.disabled && pick(m.id)}
              disabled={m.disabled}
              className={`flex w-full items-start gap-2 rounded-xl px-3 py-2 text-left ${m.disabled ? "cursor-not-allowed opacity-45" : "hover:bg-panel-2"} ${m.id === current.id ? "bg-panel-2" : ""}`}
            >
              <span className="mt-0.5 w-3 text-accent-2">{m.id === current.id ? "✓" : ""}</span>
              <span>
                <span className="block text-sm text-fg">{m.label}</span>
                <span className="block text-xs text-muted">{m.hint}</span>
              </span>
            </button>
          ))}
          <p className="px-3 pb-2 pt-1 text-[11px] text-muted/80">{x("Narx: 1M kirish / chiqish token uchun")}</p>
        </motion.div>,
        document.body,
      )}
    </div>
  );
}
