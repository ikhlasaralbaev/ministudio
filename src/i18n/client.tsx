"use client";
import { createContext, useContext, useMemo } from "react";
import { useRouter } from "next/navigation";
import { APP_DICT, type AppDict } from "./app";
import { DEFAULT_LOCALE, LOCALE_COOKIE, type Locale } from "./config";
import { makeX, type XFn } from "./x";

const Ctx = createContext<Locale>(DEFAULT_LOCALE);

export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

export const useLocale = () => useContext(Ctx);

/** Copy dictionary for the active language. */
export function useT(): AppDict {
  const l = useLocale();
  return useMemo(() => APP_DICT[l], [l]);
}

/** Translator for the inner pages: x("Uzbek text", { vars }) returns the text in the active language. */
export function useX(): XFn {
  const l = useLocale();
  return useMemo(() => makeX(l), [l]);
}

/** Persist the language in a cookie and re-render server components. */
export function useSetLocale() {
  const router = useRouter();
  return (l: Locale) => {
    document.cookie = `${LOCALE_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  };
}
