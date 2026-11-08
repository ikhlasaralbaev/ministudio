"use client";
import { useEffect, useRef, useState } from "react";

type Line = { k: "cmd" | "dm" | "ok" | "live"; text: string };
const DELAYS = [0, 500, 900, 1300, 1700, 2100, 2500];

/** Publish terminal that replays once it scrolls into view, then loops. */
export function Terminal({ lines }: { lines: Line[] }) {
  const ref = useRef<HTMLPreElement>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let timers: ReturnType<typeof setTimeout>[] = [];
    const run = () => {
      setShown(0);
      timers = lines.map((_, i) => setTimeout(() => setShown(i + 1), DELAYS[i] ?? i * 400));
      timers.push(setTimeout(run, 7500));
    };
    const io = new IntersectionObserver(
      (e) => {
        if (e[0].isIntersecting) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      timers.forEach(clearTimeout);
    };
  }, [lines]);

  return (
    <pre ref={ref} className="mono" aria-label="ministudio publish">
      {lines.slice(0, shown).map((l, i) => (
        <span key={i} style={{ display: "block" }}>
          {l.k === "cmd" && (
            <>
              <span className="pp">$</span> {l.text}
            </>
          )}
          {l.k === "dm" && <span className="dm">{l.text}</span>}
          {l.k === "ok" && (
            <>
              <span className="ok">✓</span> {l.text.split(/(@\w+)/).map((p, j) => (p.startsWith("@") ? <span key={j} className="pp">{p}</span> : p))}
            </>
          )}
          {l.k === "live" && (
            <>
              <span className="ok">{l.text.split(" ")[0]}</span> {l.text.split(" ").slice(1).join(" ")}
            </>
          )}
        </span>
      ))}
    </pre>
  );
}
