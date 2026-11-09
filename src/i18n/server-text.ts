import type { Locale } from "./config";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale } from "./config";
import SERVER from "./x/server";

export { SERVER };

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
let rules: { re: RegExp; names: string[]; key: string }[] | null = null;
const getRules = () =>
  (rules ??= Object.keys(SERVER)
    .filter((k) => /\{\w+\}/.test(k))
    .sort((a, b) => b.length - a.length)
    .map((key) => {
      const names: string[] = [];
      const re = new RegExp("^" + esc(key).replace(/\\\{(\w+)\\\}/g, (_, n) => (names.push(n), "([\\s\\S]+?)")) + "$");
      return { re, names, key };
    }));

/** An error message from the server in the person's language: exact text first, then texts with {placeholders}; unknown stays as is. */
export function translateServer(locale: Locale, msg: string): string {
  if (locale === "uz" || !msg) return msg;
  const exact = SERVER[msg];
  if (exact) return exact[locale] || msg;
  for (const r of getRules()) {
    const m = r.re.exec(msg);
    if (m) {
      const t = SERVER[r.key][locale];
      if (!t) return msg;
      return t.replace(/\{(\w+)\}/g, (_, n) => m[1 + r.names.indexOf(n)] ?? "");
    }
  }
  return msg;
}

/** The language cookie in the browser (the same one the interface uses). */
export function browserLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const m = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]+)`));
  return m && isLocale(m[1]) ? m[1] : DEFAULT_LOCALE;
}

/** A label that may come from the server (table columns): translated when known, user-written labels stay as they are. */
export const tl = (label: string) => translateServer(browserLocale(), label);
