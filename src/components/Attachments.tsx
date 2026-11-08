"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { Paperclip, X } from "@phosphor-icons/react";
import { ACCEPT, pickImages } from "@/lib/attachFiles";

export interface Attached {
  key: string;
  file: File;
  url: string;
}
export interface Attachments {
  items: Attached[];
  error: string;
  add: (files: File[]) => void;
  remove: (key: string) => void;
  clear: () => void;
}

/** Images attached to a prompt: pick, paste or drop them; each gets a preview URL that is released on removal. */
export function useAttachments(): Attachments {
  const [items, setItems] = useState<Attached[]>([]);
  const [error, setError] = useState("");
  const live = useRef<Attached[]>([]);
  live.current = items;

  const add = useCallback((files: File[]) => {
    const { ok, error } = pickImages(files, live.current.length);
    setError(error);
    if (ok.length) setItems((cur) => [...cur, ...ok.map((file) => ({ key: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`, file, url: URL.createObjectURL(file) }))]);
  }, []);
  const remove = useCallback((key: string) => {
    setItems((cur) => {
      cur.filter((x) => x.key === key).forEach((x) => URL.revokeObjectURL(x.url));
      return cur.filter((x) => x.key !== key);
    });
    setError("");
  }, []);
  const clear = useCallback(() => {
    live.current.forEach((x) => URL.revokeObjectURL(x.url));
    setItems([]);
    setError("");
  }, []);
  useEffect(() => () => live.current.forEach((x) => URL.revokeObjectURL(x.url)), []);
  return { items, error, add, remove, clear };
}

/** Handlers to put on a box so images can be pasted into it or dropped onto it. */
export function imageDropProps(a: Attachments, disabled?: boolean) {
  return {
    onPaste: (e: React.ClipboardEvent) => {
      const files = [...e.clipboardData.files].filter((f) => f.type.startsWith("image/"));
      if (files.length && !disabled) {
        e.preventDefault();
        a.add(files);
      }
    },
    onDragOver: (e: React.DragEvent) => {
      if (!disabled && [...e.dataTransfer.types].includes("Files")) e.preventDefault();
    },
    onDrop: (e: React.DragEvent) => {
      if (disabled) return;
      const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
      if (files.length) {
        e.preventDefault();
        a.add(files);
      }
    },
  };
}

export function AttachButton({ onFiles, disabled, title = "Reference rasm qo'shish" }: { onFiles: (f: File[]) => void; disabled?: boolean; title?: string }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={(e) => {
          onFiles([...(e.target.files || [])]);
          e.target.value = "";
        }}
      />
      <button type="button" disabled={disabled} onClick={() => input.current?.click()} className="btn btn-sm !px-2" title={title} aria-label={title}>
        <Paperclip size={15} />
      </button>
    </>
  );
}

export function AttachThumbs({ a }: { a: Attachments }) {
  if (!a.items.length && !a.error) return null;
  return (
    <div className="px-4 pb-2">
      {a.items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {a.items.map((x) => (
            <div key={x.key} className="group relative h-12 w-12 overflow-hidden rounded-lg border border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={x.url} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => a.remove(x.key)} className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-black/70 text-white opacity-0 transition group-hover:opacity-100" aria-label="Olib tashlash">
                <X size={10} weight="bold" />
              </button>
            </div>
          ))}
        </div>
      )}
      {a.error && <p className="mt-1 text-xs text-danger">{a.error}</p>}
    </div>
  );
}
