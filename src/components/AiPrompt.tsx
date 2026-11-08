"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Sparkle } from "@phosphor-icons/react";

/** Types the given lines one after another, like an assistant suggesting ideas (paused while `on` is false). */
function useTypewriter(lines: string[], on: boolean) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (!on || !lines.length) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setText(lines[0]);
      return;
    }
    let i = 0, n = 0, dir = 1, wait = 0;
    const id = setInterval(() => {
      if (wait > 0) return void wait--;
      n += dir;
      setText(lines[i].slice(0, n));
      if (dir === 1 && n >= lines[i].length) {
        dir = -1;
        wait = 38;
      } else if (dir === -1 && n <= 0) {
        dir = 1;
        i = (i + 1) % lines.length;
        wait = 6;
      }
    }, 32);
    return () => clearInterval(id);
  }, [lines, on]);
  return on ? text : "";
}

/**
 * The prompt input of the platform: a glowing "AI" box with a live placeholder (ideas type themselves out), example
 * chips, a round send button and a working animation. Cmd/Ctrl+Enter sends.
 */
export function AiPrompt({
  value,
  onChange,
  onSubmit,
  busy = false,
  busyLabel,
  submitLabel,
  placeholders,
  examples = [],
  footerLeft,
  extra,
  minLength = 5,
  rows = 3,
  autoFocus = false,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  busy?: boolean;
  busyLabel: string;
  submitLabel: string;
  placeholders: string[];
  examples?: string[];
  footerLeft?: React.ReactNode;
  /** Right of the send button (e.g. a model picker). */
  extra?: React.ReactNode;
  minLength?: number;
  rows?: number;
  autoFocus?: boolean;
}) {
  const [focus, setFocus] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const hint = useTypewriter(placeholders, !value && !busy);
  const can = !busy && value.trim().length >= minLength;

  // grow with the text, up to a limit
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  }, [value]);

  return (
    <div className="ai-wrap" data-busy={busy}>
      <div className="ai-glow" aria-hidden />
      <div className="ai-border">
        <div className="ai-inner">
          <div className="flex items-center gap-2 px-4 pt-3 text-[12px] font-medium text-muted">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-accent to-pur text-white">
              <Sparkle weight="fill" size={13} className="ai-spark" />
            </span>
            <span className="bg-gradient-to-r from-accent-2 to-pur bg-clip-text font-semibold text-transparent">AI</span>
            <span className={`ml-auto flex items-center gap-1.5 ${busy ? "text-pur" : ""}`}>
              <i className={`h-1.5 w-1.5 rounded-full ${busy ? "animate-pulse bg-pur" : "bg-ok"}`} />
              {busy ? busyLabel : "online"}
            </span>
          </div>

          <div className="relative px-4 pb-1 pt-2">
            {!value && !focus && (
              <div aria-hidden className="ai-caret pointer-events-none absolute inset-x-4 top-2 text-[15px] leading-relaxed text-muted/70">
                {hint}
              </div>
            )}
            <textarea
              ref={area}
              autoFocus={autoFocus}
              rows={rows}
              value={value}
              disabled={busy}
              aria-label={placeholders[0]}
              maxLength={2000}
              onFocus={() => setFocus(true)}
              onBlur={() => setFocus(false)}
              onChange={(e) => onChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && can) onSubmit();
              }}
              className="block w-full resize-none bg-transparent text-[15px] leading-relaxed outline-none"
            />
          </div>

          {examples.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pb-2">
              {examples.map((x) => (
                <button
                  type="button"
                  key={x}
                  disabled={busy}
                  onClick={() => {
                    onChange(x);
                    area.current?.focus();
                  }}
                  className="lb lb-muted transition hover:border-pur hover:text-fg disabled:opacity-40"
                >
                  {x}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2 border-t border-line/70 px-3 py-2.5">
            <span className="min-w-0 flex-1 truncate text-xs text-muted">{footerLeft}</span>
            {extra}
            <button type="button" disabled={!can} onClick={onSubmit} className="ai-send">
              {busy ? (
                <span className="ai-dots" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
              ) : (
                <>
                  {submitLabel}
                  <ArrowUp weight="bold" size={15} />
                </>
              )}
            </button>
          </div>
          {busy && <div className="ai-bar" />}
        </div>
      </div>
    </div>
  );
}
