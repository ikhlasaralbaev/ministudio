// Compact text syntax the Studio uses to edit bot buttons, keyboards and flow steps in one textarea.
//   buttons:  one row per line, buttons separated by " | ", each "Label -> target"
//             target = app (opens the mini app) | https://link | <message or flow id>
//   keyboard: one row per line, labels separated by " | "
//   steps:    one per line "key | question | kind | option1, option2"  (kind: text, phone, number, choice)
import type { BotButton, BotFlow } from "./types";

const ID = /^[a-z0-9_-]{1,24}$/;

export function formatButtons(rows: BotButton[][] | undefined): string {
  return (rows || [])
    .map((r) => r.map((b) => `${b.text} -> ${b.url ?? (b.app ? "app" : b.to ?? "")}`).join(" | "))
    .join("\n");
}

export function parseButtons(text: string): BotButton[][] {
  return text
    .split("\n")
    .map((line) =>
      line
        .split("|")
        .map((part) => {
          const [label, ...rest] = part.split("->");
          const text = label.trim();
          const target = rest.join("->").trim();
          if (!text || !target) return null;
          if (target === "app") return { text, app: true } as BotButton;
          if (/^https?:\/\//i.test(target)) return { text, url: target } as BotButton;
          return ID.test(target) ? ({ text, to: target } as BotButton) : null;
        })
        .filter((b): b is BotButton => !!b),
    )
    .filter((r) => r.length);
}

export const formatKeyboard = (rows: string[][] | undefined) => (rows || []).map((r) => r.join(" | ")).join("\n");

export function parseKeyboard(text: string): string[][] {
  return text
    .split("\n")
    .map((l) => l.split("|").map((x) => x.trim()).filter(Boolean))
    .filter((r) => r.length);
}

type Step = BotFlow["steps"][number];

export function formatSteps(steps: Step[]): string {
  return steps.map((s) => [s.key, s.ask, s.kind ?? "text", (s.options || []).join(", ")].join(" | ").replace(/( \| )+$/, "")).join("\n");
}

export function parseSteps(text: string): Step[] {
  const out: Step[] = [];
  for (const line of text.split("\n")) {
    const [rawKey, ask = "", rawKind = "text", opts = ""] = line.split("|").map((x) => x.trim());
    const key = (rawKey || "").replace(/[^A-Za-z0-9_]/g, "");
    if (!/^[A-Za-z]/.test(key)) continue;
    const kind = (["text", "phone", "number", "choice"].includes(rawKind) ? rawKind : "text") as Step["kind"];
    const options = opts.split(",").map((x) => x.trim()).filter(Boolean);
    out.push({ key: key.slice(0, 32), ask: ask.slice(0, 500), kind, ...(kind === "choice" ? { options: options.slice(0, 12) } : {}) });
  }
  return out.slice(0, 10);
}

/** Lowercase slug for ids and command names. */
export const slug = (s: string, max = 24) => s.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, max);
