/**
 * The language a generated app speaks right now: the user's own choice (state.lang, set by the app's UZ/RU switch)
 * wins, otherwise Telegram's interface language (Russian speakers get "ru", everyone else "uz").
 * Apps built "in two languages" write every text as {{ lang == 'ru' ? '...' : '...' }}.
 */
export type AppLang = "uz" | "ru";

export function appLang(chosen: unknown, telegramLanguageCode?: string | null): AppLang {
  if (chosen === "ru" || chosen === "uz") return chosen;
  return typeof telegramLanguageCode === "string" && telegramLanguageCode.toLowerCase().startsWith("ru") ? "ru" : "uz";
}
