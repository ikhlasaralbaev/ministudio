"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Sparkle } from "@phosphor-icons/react";
import { api, timeAgo } from "@/lib/client";
import { AI_MODELS } from "@/lib/models";

export interface PromptItem {
  id: string;
  userId: string;
  userEmail: string;
  kind: "generate" | "edit";
  prompt: string;
  nodeId: string | null;
  model: string;
  mock: boolean;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  durationMs: number;
  status: "ok" | "error";
  message: string | null;
  opsCount: number | null;
  error: string | null;
  at: string;
}

const num = (n: number) => n.toLocaleString("ru-RU");
const modelLabel = (id: string, mock: boolean) => (mock ? "Demo" : AI_MODELS.find((m) => m.id === id)?.label || id);
const secs = (ms: number) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);

const STARTERS = [
  "Kafe uchun menyu, savat va buyurtma berish ilovasi",
  "Sartaroshxonaga yozilish: xizmatlar, usta va vaqt tanlash",
  "Kurslar katalogi va ro'yxatdan o'tish formasi",
];
const EDIT_IDEAS = ["Dizaynni zamonaviyroq va toza qil", "Bosh sahifaga aksiya banneri qo'sh", "Ranglarni to'q mavzuga o'tkaz"];

function Meta({ item }: { item: PromptItem }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted">
      <span className="rounded bg-panel-2 px-1.5 py-px text-fg/70">{modelLabel(item.model, item.mock)}</span>
      <span title="Kirish / chiqish tokenlari">
        ↑ {num(item.inputTokens)} · ↓ {num(item.outputTokens)} token
      </span>
      <span>{secs(item.durationMs)}</span>
      {item.status === "ok" && item.opsCount != null && (
        <span>{item.kind === "generate" ? `${item.opsCount} ekran` : `${item.opsCount} o'zgarish`}</span>
      )}
    </div>
  );
}

/**
 * Vibe-mode chat: the project's prompt history (every AI request with its tokens and outcome)
 * plus the input that drives generation and edits.
 */
export function ChatPanel({
  projectId,
  hasDoc,
  busy,
  readOnly,
  refreshKey,
  meId,
  onSend,
}: {
  projectId: string;
  hasDoc: boolean;
  busy: boolean;
  readOnly: boolean;
  refreshKey: number;
  meId: string | null;
  onSend: (text: string) => void;
}) {
  const [items, setItems] = useState<PromptItem[] | null>(null);
  const [err, setErr] = useState("");
  const [text, setText] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(
    () =>
      api<{ items: PromptItem[] }>(`/api/projects/${projectId}/prompts`)
        .then((r) => {
          setItems(r.items.slice().reverse());
          setErr("");
        })
        .catch((e) => setErr(e.message)),
    [projectId],
  );
  useEffect(() => {
    load().then(() => setPending(null));
  }, [load, refreshKey]);

  useLayoutEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items, pending, busy]);

  useLayoutEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 180) + "px";
  }, [text]);

  function send(t = text) {
    const v = t.trim();
    if (!v || busy || readOnly) return;
    setPending(v);
    setText("");
    onSend(v);
  }

  const totals = (items || []).reduce(
    (a, i) => (i.mock ? a : { n: a.n + 1, tokens: a.tokens + i.totalTokens }),
    { n: 0, tokens: 0 },
  );
  const ideas = hasDoc ? EDIT_IDEAS : STARTERS;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={listRef} className="scroll-thin flex-1 space-y-5 overflow-y-auto px-4 py-5">
        {err && <p className="text-sm text-danger">{err}</p>}
        {items && items.length === 0 && !pending && (
          <div className="pt-6 text-center">
            <div className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-2xl bg-accent/15 text-xl text-accent-2"><Sparkle weight="fill" /></div>
            <p className="font-medium">{hasDoc ? "Ilovani o'zgartiramiz" : "Qanday ilova yaratamiz?"}</p>
            <p className="mx-auto mt-1 max-w-xs text-sm text-muted">
              {hasDoc ? "Nimani o'zgartirish kerakligini oddiy so'z bilan yozing." : "Biznesingizni tasvirlab bering — AI ekranlar, dizayn va logikani yaratadi."}
            </p>
          </div>
        )}

        {items?.map((it) => (
          <div key={it.id} className="space-y-2">
            {/* user */}
            <div className="flex flex-col items-end">
              <div className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent/90 px-3.5 py-2 text-[14px] leading-relaxed text-fg">
                {it.prompt}
              </div>
              <div className="mt-1 flex gap-2 text-[11px] text-muted">
                {it.userId !== meId && <span>{it.userEmail}</span>}
                {it.nodeId && <span className="font-mono">→ {it.nodeId}</span>}
                <span>{timeAgo(it.at)}</span>
              </div>
            </div>
            {/* assistant */}
            <div className="flex flex-col items-start">
              <div
                className={`max-w-[88%] rounded-2xl rounded-bl-md px-3.5 py-2 text-[14px] leading-relaxed ${
                  it.status === "error" ? "border border-danger/30 bg-danger/10 text-danger" : "bg-panel-2 text-white/90"
                }`}
              >
                {it.status === "error" ? `Xato: ${it.error}` : it.message || "Bajarildi"}
              </div>
              <Meta item={it} />
            </div>
          </div>
        ))}

        {pending && (
          <div className="space-y-2">
            <div className="flex justify-end">
              <div className="max-w-[88%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent/90 px-3.5 py-2 text-[14px] text-fg">{pending}</div>
            </div>
            {busy && (
              <div className="flex items-center gap-2 text-sm text-muted">
                <span className="flex gap-1">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-2 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-2 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary-2" />
                </span>
                {hasDoc ? "AI o'zgartirmoqda…" : "AI ilovani chizmoqda… (30–90 s)"}
              </div>
            )}
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="border-t border-line p-3">
          {!busy && items !== null && items.length === 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {ideas.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="rounded-full border border-line px-2.5 py-1 text-xs text-muted hover:border-accent/60 hover:text-fg"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className={`rounded-2xl border border-line bg-panel-2 p-2 focus-within:border-accent/60 ${busy ? "ai-working" : ""}`}>
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              disabled={busy}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={hasDoc ? "Nimani o'zgartiramiz?" : "Ilovangizni tasvirlab bering…"}
              className="block max-h-[180px] w-full resize-none bg-transparent px-2 py-1.5 text-[14px] outline-none placeholder:text-muted/60"
            />
            <div className="flex items-center justify-between px-1 pt-1">
              <span className="text-[11px] text-muted">
                {totals.n ? `${totals.n} so'rov · ${num(totals.tokens)} token` : "↵ yuborish · ⇧↵ yangi qator"}
              </span>
              <button
                onClick={() => send()}
                disabled={busy || !text.trim()}
                className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-white hover:bg-primary-2 disabled:opacity-40"
                title="Yuborish"
              >
                ↑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
