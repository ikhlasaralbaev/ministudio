// The Icon node: Phosphor icons served by the Iconify API as tinted SVGs (no icon bundle in the app, any size/color).
import { ICON_NAMES } from "./icon-names";

export const ICON_WEIGHTS = ["thin", "light", "regular", "bold", "fill", "duotone"] as const;
export type IconWeight = (typeof ICON_WEIGHTS)[number];

/** "shopping-cart", or with the weight in the name ("shopping-cart-fill"): returns the base name and weight. */
export function parseIcon(name: string, weight?: string): { base: string; weight: IconWeight } | null {
  const raw = name.trim().toLowerCase();
  let base = raw;
  let w: IconWeight = (ICON_WEIGHTS as readonly string[]).includes(weight || "") ? (weight as IconWeight) : "bold";
  for (const x of ICON_WEIGHTS) {
    if (raw.endsWith("-" + x) && ICON_NAMES.has(raw.slice(0, -x.length - 1))) {
      base = raw.slice(0, -x.length - 1);
      w = x;
      break;
    }
  }
  return ICON_NAMES.has(base) ? { base, weight: w } : null;
}

export function iconUrl(name: string, color: string, weight?: string): string | null {
  const p = parseIcon(name, weight);
  if (!p) return null;
  const hex = /^#[0-9a-f]{3,8}$/i.test(color) ? color : "#111111";
  return `https://api.iconify.design/ph/${p.base}${p.weight === "regular" ? "" : "-" + p.weight}.svg?color=${encodeURIComponent(hex)}`;
}
