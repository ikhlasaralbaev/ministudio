"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { AppDoc } from "@/lib/types";
import type { RecordRow, RecordsByCollection } from "@/lib/records";
import { AppView, useRuntime, type Host } from "@/components/runtime";
import { useLocale, useX } from "@/i18n/client";
import type { XFn } from "@/i18n/x";

const W = 390;

/** A host with no server behind it: rows live in memory, every outgoing action just shows what it would do. */
export function demoHost(toast: (t: string) => void, x: XFn): Host {
  let n = 1000;
  const store: RecordsByCollection = {};
  return {
    async dbList() {
      return structuredClone(store);
    },
    async dbInsert(collection, value) {
      n++;
      const data = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : { value };
      const row: RecordRow = { ...data, _id: `demo_${n}`, _number: n, _at: new Date().toISOString() };
      store[collection] = [row, ...(store[collection] || [])];
      return { id: String(n), row };
    },
    async dbUpdate(collection, id, value) {
      const old = (store[collection] || []).find((r) => r._id === id);
      if (!old) throw new Error("not found");
      const row = { ...old, ...(value as Record<string, unknown>), _id: old._id, _number: old._number, _at: old._at };
      store[collection] = (store[collection] || []).map((r) => (r._id === id ? row : r));
      return row;
    },
    async dbDelete(collection, id) {
      store[collection] = (store[collection] || []).filter((r) => r._id !== id);
    },
    async notifyOwner() {
      toast(x("Namuna: egasiga xabar yuboriladi"));
    },
    async pay() {
      toast(x("Namuna: to'lov sahifasi ochiladi"));
      return null;
    },
    toast,
  };
}

function Running({ doc, interactive }: { doc: AppDoc; interactive: boolean }) {
  const x = useX();
  const [toast, setToast] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const host = useMemo(
    () =>
      demoHost((t) => {
        setToast(t);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setToast(null), 2200);
      }, x),
    [x],
  );
  useEffect(() => () => clearTimeout(timer.current), []);
  const rt = useRuntime(doc, host);
  return (
    <div className="relative" style={{ width: W, minHeight: "100%", background: doc.theme.background, pointerEvents: interactive ? undefined : "none" }}>
      <AppView doc={doc} rt={rt} />
      {toast && (
        <div className="pointer-events-none sticky bottom-4 mx-4 rounded-2xl bg-black/85 px-4 py-3 text-[13px] text-white" style={{ marginTop: -56 }}>
          {toast}
        </div>
      )}
    </div>
  );
}

/**
 * The first screen of a template, drawn live (not a screenshot) and scaled to the card width. It mounts only when the
 * card scrolls into view, so a page of twenty templates does not render twenty apps at once.
 */
export function TemplateThumb({ doc }: { doc: AppDoc }) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.55);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / W));
    ro.observe(el);
    setScale(el.clientWidth / W);
    const io = new IntersectionObserver(
      (e) => {
        if (e.some((i) => i.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: "300px" },
    );
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  return (
    <div ref={box} className="relative w-full overflow-hidden" style={{ aspectRatio: "390 / 560", background: doc.theme.background }}>
      {seen && (
        <div className="absolute left-0 top-0 origin-top-left" style={{ width: W, height: 560, transform: `scale(${scale})` }} inert>
          <div style={{ width: W, height: 560, overflow: "hidden" }}>
            <Running doc={doc} interactive={false} />
          </div>
        </div>
      )}
    </div>
  );
}

/** The whole template as a working app: browse, add to the cart, fill the form. Nothing is saved anywhere. */
export function TemplateLive({ doc }: { doc: AppDoc }) {
  const locale = useLocale();
  return <Running key={`${doc.name}-${locale}`} doc={doc} interactive />;
}
