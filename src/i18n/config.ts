// Interface languages. Karakalpak uses the 2016 Latin alphabet (á ǵ ı ń ó ú).
export const LOCALES = ["kaa", "uz", "en", "ru"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "uz";
export const LOCALE_COOKIE = "lang";

export const LOCALE_LABEL: Record<Locale, { short: string; name: string; html: string }> = {
  kaa: { short: "QQ", name: "Qaraqalpaqsha", html: "kaa" },
  uz: { short: "UZ", name: "O‘zbekcha", html: "uz" },
  en: { short: "EN", name: "English", html: "en" },
  ru: { short: "RU", name: "Русский", html: "ru" },
};

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}
