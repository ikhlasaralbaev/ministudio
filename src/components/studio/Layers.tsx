"use client";
import { useState } from "react";
import { Eye } from "@phosphor-icons/react";
import type { AppDoc, UINode } from "@/lib/types";
import { CONTAINERS, nodeLabel, TYPE_ICON } from "./describe";

type DropPos = "before" | "after" | "inside";

export function Layers({
  doc,
  screenId,
  selectedId,
  onSelect,
  onScreen,
  onMove,
  onAddScreen,
  readOnly = false,
}: {
  doc: AppDoc;
  screenId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onScreen: (id: string) => void;
  onMove: (id: string, targetId: string, pos: DropPos) => void;
  onAddScreen: () => void;
  readOnly?: boolean;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<{ id: string; pos: DropPos } | null>(null);

  const row = (n: UINode, depth: number) => {
    const isSel = selectedId === n.id;
    const hasKids = !!n.children?.length;
    const open = !collapsed[n.id];
    const isScreen = n.type === "Screen";
    const ov = over?.id === n.id ? over.pos : null;
    return (
      <div key={n.id}>
        <div
          draggable={!readOnly && !isScreen}
          onDragStart={(e) => {
            setDrag(n.id);
            e.dataTransfer.effectAllowed = "move";
          }}
          onDragEnd={() => {
            setDrag(null);
            setOver(null);
          }}
          onDragOver={(e) => {
            if (readOnly || !drag || drag === n.id) return;
            e.preventDefault();
            const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
            const y = (e.clientY - r.top) / r.height;
            let pos: DropPos = y < 0.3 ? "before" : y > 0.7 ? "after" : CONTAINERS.has(n.type) ? "inside" : "after";
            if (isScreen) pos = "inside";
            setOver({ id: n.id, pos });
          }}
          onDragLeave={() => setOver((o) => (o?.id === n.id ? null : o))}
          onDrop={(e) => {
            e.preventDefault();
            if (!readOnly && drag && over) onMove(drag, over.id, over.pos);
            setDrag(null);
            setOver(null);
          }}
          onClick={() => (isScreen ? (onScreen(n.id), onSelect(n.id)) : onSelect(n.id))}
          className={`group relative flex h-7 cursor-pointer items-center gap-1.5 rounded-md pr-2 text-[13px] ${
            isSel ? "bg-accent/25 text-fg" : "text-fg/80 hover:bg-panel-2"
          } ${ov === "inside" ? "ring-1 ring-accent" : ""}`}
          style={{ paddingLeft: 6 + depth * 14 }}
        >
          {ov === "before" && <div className="absolute inset-x-1 top-0 h-0.5 bg-primary" />}
          {ov === "after" && <div className="absolute inset-x-1 bottom-0 h-0.5 bg-primary" />}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed({ ...collapsed, [n.id]: open });
            }}
            className={`w-3 text-[10px] text-muted ${hasKids ? "" : "invisible"}`}
          >
            {open ? "▾" : "▸"}
          </button>
          <span className="w-4 text-center text-[11px] text-muted">{TYPE_ICON[n.type]}</span>
          <span className={`truncate ${isScreen ? "font-medium" : ""}`}>{nodeLabel(n)}</span>
          {n.events?.onClick?.length ? <span className="ml-auto text-[10px] text-warn" title="Logika bor">ƒ</span> : null}
          {n.visibleIf ? <span className={`${n.events?.onClick?.length ? "" : "ml-auto"} text-accent-2`} title={"Ko'rinish sharti: " + n.visibleIf}><Eye size={12} /></span> : null}
        </div>
        {hasKids && open && n.children!.map((c) => row(c, depth + 1))}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 pb-1 pt-3">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Qatlamlar</span>
        {!readOnly && (
          <button onClick={onAddScreen} className="text-xs text-muted hover:text-fg" title="Yangi ekran">
            + Ekran
          </button>
        )}
      </div>
      <div className="scroll-thin flex-1 overflow-auto px-1.5 pb-4">
        {doc.screens.map((s) => (
          <div key={s.id} className={`mb-1 rounded-lg ${s.id === screenId ? "bg-white/[0.03]" : "opacity-70"}`}>
            {row(s, 0)}
          </div>
        ))}
      </div>
    </div>
  );
}
