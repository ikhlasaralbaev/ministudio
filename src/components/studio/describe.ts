import { makeX, type XFn } from "@/i18n/x";
import type { Action, AppDoc, UINode } from "@/lib/types";

export function nodeLabel(n: UINode): string {
  if (n.name) return n.name;
  const t = (n.type === "Icon" ? (n.props?.name as string) : undefined) || (n.props?.text as string) || (n.props?.title as string) || (n.props?.placeholder as string) || (n.props?.source as string);
  if (t) return String(t).replace(/\{\{\s*|\s*\}\}/g, "").slice(0, 28);
  return n.type;
}

export const TYPE_ICON: Record<string, string> = {
  Screen: "▢",
  Box: "☐",
  Row: "⇆",
  Text: "T",
  Image: "▣",
  Icon: "✦",
  Button: "◉",
  Input: "⌨",
  List: "≣",
  Badge: "◆",
  Divider: "—",
  Spacer: "↕",
};

export const CONTAINERS = new Set(["Screen", "Box", "Row", "List"]);

export function describeAction(a: Action, doc: AppDoc, x: XFn = makeX("uz")): string {
  switch (a.type) {
    case "setState":
      return `state.${a.key} = ${a.value}`;
    case "append":
      return x("state.{k} ga qo'shish ← {v}", { k: a.key, v: a.value });
    case "removeAt":
      return x("state.{k} dan o'chirish [{i}]", { k: a.key, i: a.index });
    case "navigate": {
      const s = doc.screens.find((x) => x.id === a.screen);
      return x('→ "{s}" ekraniga o\'tish', { s: s ? nodeLabel(s) : a.screen });
    }
    case "back":
      return x("← Orqaga");
    case "alert":
      return x('Xabar: "{t}"', { t: a.text });
    case "haptic":
      return x("Vibratsiya ({s})", { s: a.style || "light" });
    case "dbInsert":
      return x("Bazaga yozish → {c}", { c: a.collection });
    case "dbUpdate":
      return x("Yozuvni yangilash → {c} [{i}]", { c: a.collection, i: a.id });
    case "dbDelete":
      return x("Yozuvni o'chirish → {c} [{i}]", { c: a.collection, i: a.id });
    case "notifyOwner":
      return x("Egasiga Telegram xabar");
    case "pay":
      return x("To'lov ({p}): {a}", { p: a.provider, a: a.amount });
    case "openLink":
      return x("Havola: {u}", { u: a.url });
    case "closeApp":
      return x("Ilovani yopish");
    case "if":
      return x("Agar {c}: {n} amal", { c: a.cond, n: a.then.length }) + (a.else?.length ? x(", aks holda {n} amal", { n: a.else.length }) : "");
  }
}
