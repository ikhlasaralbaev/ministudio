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

export function describeAction(a: Action, doc: AppDoc): string {
  switch (a.type) {
    case "setState":
      return `state.${a.key} = ${a.value}`;
    case "append":
      return `state.${a.key} ga qo'shish ← ${a.value}`;
    case "removeAt":
      return `state.${a.key} dan o'chirish [${a.index}]`;
    case "navigate": {
      const s = doc.screens.find((x) => x.id === a.screen);
      return `→ "${s ? nodeLabel(s) : a.screen}" ekraniga o'tish`;
    }
    case "back":
      return "← Orqaga";
    case "alert":
      return `Xabar: "${a.text}"`;
    case "haptic":
      return `Vibratsiya (${a.style || "light"})`;
    case "dbInsert":
      return `Bazaga yozish → ${a.collection}`;
    case "dbUpdate":
      return `Yozuvni yangilash → ${a.collection} [${a.id}]`;
    case "dbDelete":
      return `Yozuvni o'chirish → ${a.collection} [${a.id}]`;
    case "notifyOwner":
      return "Egasiga Telegram xabar";
    case "pay":
      return `To'lov (${a.provider}): ${a.amount}`;
    case "openLink":
      return `Havola: ${a.url}`;
    case "closeApp":
      return "Ilovani yopish";
    case "if":
      return `Agar ${a.cond}: ${a.then.length} amal${a.else?.length ? `, aks holda ${a.else.length} amal` : ""}`;
  }
}
