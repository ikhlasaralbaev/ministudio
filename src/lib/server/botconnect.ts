import "server-only";
import type { WithId } from "mongodb";
import { commandList } from "../bot";
import type { AppDoc } from "../types";
import { projects, type ProjectRow } from "./projects";
import { tgApi } from "./telegram";
import { botSecret } from "./runtime";

/**
 * Points a project's Telegram bot at this platform: webhook, menu button and command list.
 * Returns the bot's username and any problems (never throws: a failing bot must not fail a publish).
 */
export async function connectBot(o: {
  p: WithId<ProjectRow>;
  doc: AppDoc;
  env: Record<string, string>;
  base: string;
}): Promise<{ botUsername?: string; warnings: string[] }> {
  const { p, doc, env, base } = o;
  const id = p._id.toHexString();
  const appUrl = `${base}/app/${p.slug}`;
  const warnings: string[] = [];
  if (!env.BOT_TOKEN) {
    warnings.push("Bot token kiritilmagan — ilova faqat havola orqali ochiladi, buyurtma/to'lov kabi server amallari esa ishlamaydi.");
    return { botUsername: p.botUsername, warnings };
  }
  if (!base.startsWith("https://")) {
    warnings.push(`Telegram faqat https manzilni qabul qiladi. PUBLIC_URL ni https ga sozlang (masalan, ngrok yoki serverdagi domen). Hozirgi: ${base}`);
    return { botUsername: p.botUsername, warnings };
  }
  let botUsername = p.botUsername;
  try {
    const me = await tgApi<{ username: string }>(env.BOT_TOKEN, "getMe");
    botUsername = me.username;
    await tgApi(env.BOT_TOKEN, "setWebhook", {
      url: `${base}/api/bot/${id}`,
      secret_token: botSecret(id),
      allowed_updates: ["message", "callback_query"],
      drop_pending_updates: false,
    });
    await tgApi(env.BOT_TOKEN, "setChatMenuButton", {
      menu_button: { type: "web_app", text: (doc.bot?.buttonText || "Ochish").slice(0, 32), web_app: { url: appUrl } },
    });
    await tgApi(env.BOT_TOKEN, "setMyCommands", { commands: commandList(doc.bot) });
    if (botUsername !== p.botUsername) await (await projects()).updateOne({ _id: p._id }, { $set: { botUsername } });
  } catch (e) {
    warnings.push((e as Error).message);
  }
  return { botUsername, warnings };
}
