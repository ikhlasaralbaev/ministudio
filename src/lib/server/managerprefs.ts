import "server-only";
import { db } from "./db";
import { DEFAULT_BOT_LANG, isBotLang, type BotLang } from "../managerI18n";

const col = async () => (await db()).collection<{ tgId: number; lang: string }>("manager_prefs");

/** The manager bot's language for a Telegram user: their /language choice, Russian until they pick one. */
export async function getBotLang(tgId: number | undefined): Promise<BotLang> {
  if (!tgId) return DEFAULT_BOT_LANG;
  const row = await (await col()).findOne({ tgId });
  return isBotLang(row?.lang) ? row.lang : DEFAULT_BOT_LANG;
}

export async function setBotLang(tgId: number, lang: BotLang) {
  await (await col()).updateOne({ tgId }, { $set: { lang } }, { upsert: true });
}
