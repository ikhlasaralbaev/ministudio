import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";

/** Cookie choice first, then the browser's Accept-Language, then Uzbek. */
export async function getLocale(): Promise<Locale> {
  const c = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(c)) return c;
  const accept = ((await headers()).get("accept-language") || "").toLowerCase();
  for (const part of accept.split(",")) {
    const tag = part.split(";")[0].trim();
    const base = tag.split("-")[0];
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
