import type { Locale } from "./config";
import studio from "./x/studio";
import settings from "./x/settings";
import data from "./x/data";
import admin from "./x/admin";
import editor from "./x/editor";

/**
 * Interface texts of the inner pages (studio, settings, data, admin...). The Uzbek text IS the key: code reads
 * `x("Saqlash")` and gets the text in the active language; a missing entry falls back to the Uzbek source, so a
 * forgotten string is visible but never broken. test/i18n-x.test.ts checks that every x("...") in the source has
 * all three translations and the same {placeholders}.
 */
export interface XEntry {
  kaa: string;
  en: string;
  ru: string;
}

export const CATALOG: Record<string, XEntry> = { ...studio, ...settings, ...data, ...admin, ...editor };

/** Marks a module-level Uzbek string that is translated later with x(): `const A = [T("Matn")]` then `x(A[0])`. */
export const T = (s: string) => s;

export type XFn = (text: string, vars?: Record<string, string | number>) => string;

const fill = (s: string, vars?: Record<string, string | number>) => (vars ? s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? "")) : s);

export function makeX(locale: Locale): XFn {
  return (text, vars) => {
    if (locale === "uz") return fill(text, vars);
    const e = CATALOG[text];
    return fill(e ? e[locale] || text : text, vars);
  };
}
