"use client";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/client";
import { AI_MODELS, resolveModel } from "@/lib/models";

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
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = AI_MODELS.find((m) => m.id === resolveModel(value))!;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("mousedown", close);
    window.addEventListener("keydown", esc);
    return () => {
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
      onError("Modelni saqlab bo'lmadi: " + (e as Error).message);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="AI modeli"
        className="flex items-center gap-1.5 rounded-lg border border-line bg-panel-2 px-2.5 py-1 text-[13px] text-fg/90 hover:border-accent/60"
      >
        <span className="text-accent-2">✦</span>
        {current.label}
        <span className="text-[10px] text-muted">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-xl border border-line bg-panel p-1 shadow-2xl">
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">Claude modeli</p>
          {AI_MODELS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => pick(m.id)}
              className={`flex w-full items-start gap-2 rounded-lg px-3 py-2 text-left hover:bg-panel-2 ${m.id === current.id ? "bg-panel-2" : ""}`}
            >
              <span className="mt-0.5 w-3 text-accent-2">{m.id === current.id ? "✓" : ""}</span>
              <span>
                <span className="block text-sm text-fg">{m.label}</span>
                <span className="block text-xs text-muted">{m.hint}</span>
              </span>
            </button>
          ))}
          <p className="px-3 pb-2 pt-1 text-[11px] text-muted/80">Narx: 1M kirish / chiqish token uchun</p>
        </div>
      )}
    </div>
  );
}
