import "server-only";
import { randomBytes } from "crypto";
import { ObjectId } from "mongodb";
import { db } from "./db";
import { encryptEnv } from "./crypto";
import { envOf, getProject, projects, publicUrl } from "./projects";
import { tgApi } from "./telegram";
import { botSecret } from "./runtime";
import { connectBot } from "./botconnect";
import { consumeLinkCode, linkTelegram, peekLinkCode } from "./tglink";
import { HttpError } from "./http";

/**
 * The platform's "manager bot": a Telegram bot with Bot Management Mode enabled (done once in BotFather). With it a
 * user creates a new bot for a project with one confirmation in Telegram (Managed Bots, Bot API 9.6) and the
 * platform receives that bot's token automatically.
 */
export function managerConfig(): { token: string; username: string } | null {
  const token = process.env.TELEGRAM_MANAGER_BOT_TOKEN?.trim();
  const username = process.env.TELEGRAM_MANAGER_BOT_USERNAME?.trim().replace(/^@/, "");
  return token && username ? { token, username } : null;
}

export const managerSecret = () => botSecret("__manager__");

/** Telegram's "create this bot" screen, prefilled. Kept in one place: this is the one part of the flow to adjust if Telegram changes it. */
export function newBotLink(manager: string, suggested: string, name: string) {
  return `https://t.me/newbot/${manager}/${suggested}?name=${encodeURIComponent(name.slice(0, 64))}`;
}

/** A free-looking username: a-z 0-9 _, 5-32 chars, ending in "bot". */
export function suggestUsername(slug: string) {
  const base = slug.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 14) || "app";
  return `ms_${base}_${randomBytes(2).toString("hex")}_bot`;
}

export interface BotClaim {
  _id: ObjectId;
  projectId: string;
  userId: string;
  tgId: number;
  suggested: string;
  name: string;
  status: "pending" | "done";
  createdAt: Date;
  doneAt?: Date;
  botUsername?: string;
}
const claims = async () => (await db()).collection<BotClaim>("bot_claims");
const CLAIM_TTL_MS = 2 * 3600_000;

export async function createClaim(p: { projectId: string; userId: string; tgId: number; slug: string; name: string }) {
  const c = await claims();
  await c.createIndex({ createdAt: 1 }, { expireAfterSeconds: 86400 });
  const suggested = suggestUsername(p.slug);
  await c.insertOne({ _id: new ObjectId(), projectId: p.projectId, userId: p.userId, tgId: p.tgId, suggested, name: p.name, status: "pending", createdAt: new Date() });
  return { suggested };
}

export async function latestClaim(projectId: string) {
  return (await claims()).find({ projectId }).sort({ createdAt: -1 }).limit(1).next();
}

export interface ManagedBotUpdate {
  /** User that created the bot (their Telegram id is matched to the platform account that linked it). */
  user?: { id?: number };
  /** The new (or re-tokened) bot. */
  bot?: { id?: number; username?: string };
}

/**
 * A managed bot was created (or its token changed). Match it to the pending claim of the Telegram user who created it,
 * fetch its token, store it encrypted in the project and connect the webhook. Returns what happened, for logs.
 */
export async function handleManagedBot(mb: ManagedBotUpdate): Promise<string> {
  const m = managerConfig();
  const creator = mb.user?.id;
  const botId = mb.bot?.id;
  if (!m || !creator || !botId) return "ignored: incomplete update";

  // A known managed bot whose token changed: refresh the stored token.
  const known = await (await projects()).findOne({ managedBotId: botId } as never);
  let projectId: string | null = null;
  let claim: BotClaim | null = null;
  if (known) projectId = known._id.toHexString();
  else {
    const c = await claims();
    const pending = await c
      .find({ tgId: creator, status: "pending", createdAt: { $gt: new Date(Date.now() - CLAIM_TTL_MS) } })
      .sort({ createdAt: -1 })
      .toArray();
    // the exact username we suggested wins; otherwise the creator's newest pending claim
    claim = pending.find((x) => x.suggested === mb.bot?.username) ?? pending[0] ?? null;
    if (!claim) return "ignored: no pending claim for this Telegram user";
    projectId = claim.projectId;
  }

  const p = await getProject(projectId);
  if (!p) return "ignored: project gone";
  const token = await tgApi<string>(m.token, "getManagedBotToken", { user_id: botId });
  const env = { ...envOf(p), BOT_TOKEN: token };
  await (await projects()).updateOne(
    { _id: p._id },
    { $set: { envEnc: encryptEnv(env), botUsername: mb.bot?.username ?? p.botUsername, managedBotId: botId, updatedAt: new Date() } } as never,
  );
  if (p.publishedDoc) await connectBot({ p: { ...p, botUsername: mb.bot?.username ?? p.botUsername }, doc: p.publishedDoc, env, base: publicUrl() });
  if (claim) await (await claims()).updateOne({ _id: claim._id }, { $set: { status: "done", doneAt: new Date(), botUsername: mb.bot?.username } });
  return `connected bot ${mb.bot?.username ?? botId} to project ${projectId}`;
}

/** Sets the manager bot's webhook and reports whether Telegram lets it manage bots. */
export async function setupManager(base: string) {
  const m = managerConfig();
  if (!m) throw new Error("TELEGRAM_MANAGER_BOT_TOKEN va TELEGRAM_MANAGER_BOT_USERNAME sozlanmagan");
  const me = await tgApi<{ username: string; can_manage_bots?: boolean }>(m.token, "getMe");
  const url = `${base}/api/manager/webhook`;
  await tgApi(m.token, "setWebhook", { url, secret_token: managerSecret(), drop_pending_updates: false });
  return { username: me.username, canManageBots: !!me.can_manage_bots, webhook: url };
}

const maskEmail = (e: string) => e.replace(/^(.).*(@.*)$/, "$1***$2");

interface TgMessage {
  chat?: { id?: number };
  from?: { id?: number; first_name?: string; username?: string };
  text?: string;
}
interface TgCallback {
  id: string;
  data?: string;
  from: { id: number; first_name?: string; username?: string };
  message?: { chat?: { id?: number }; message_id?: number };
}

/**
 * Everything the manager bot receives:
 *  - managed_bot: a bot was created through us -> store its token (handleManagedBot)
 *  - "/start link_<code>": a user wants to link this Telegram account to their platform account -> ask to confirm
 *  - the confirm button ("lk:<code>") -> link it
 */
export async function handleManagerUpdate(update: {
  managed_bot?: ManagedBotUpdate;
  managed_bot_updated?: ManagedBotUpdate;
  message?: TgMessage;
  callback_query?: TgCallback;
}): Promise<string> {
  const m = managerConfig();
  if (!m) return "no manager";
  const mb = update.managed_bot ?? update.managed_bot_updated;
  if (mb) return handleManagedBot(mb);

  const msg = update.message;
  const chatId = msg?.chat?.id;
  if (msg && chatId) {
    const code = /^\/start\s+link_([a-f0-9]{36})\s*$/.exec(msg.text || "")?.[1];
    if (code) {
      const owner = await peekLinkCode(code);
      await tgApi(m.token, "sendMessage", owner
        ? {
            chat_id: chatId,
            text: `MiniStudio akkaunti ${maskEmail(owner.email)} ga ushbu Telegram'ni ulaysizmi?\n\nBu siz emas bo'lsa, «Yo'q» ni bosing.`,
            reply_markup: { inline_keyboard: [[{ text: "Ha, ulash", callback_data: `lk:${code}` }, { text: "Yo'q", callback_data: "lk:no" }]] },
          }
        : { chat_id: chatId, text: "Havola eskirgan yoki yaroqsiz. Platformada «Telegramni ulash» ni qayta bosing." }).catch(() => {});
      return owner ? "link: asked to confirm" : "link: bad code";
    }
    await tgApi(m.token, "sendMessage", {
      chat_id: chatId,
      text: "Bu MiniStudio platformasining yordamchi boti. Bot yaratish uchun platformadagi «Bot yaratish» tugmasidan foydalaning.",
    }).catch(() => {});
    return "greeted";
  }

  const cb = update.callback_query;
  if (cb?.data?.startsWith("lk:")) {
    const chat = cb.message?.chat?.id;
    const done = (text: string) =>
      Promise.all([
        tgApi(m.token, "answerCallbackQuery", { callback_query_id: cb.id }).catch(() => {}),
        chat && cb.message?.message_id ? tgApi(m.token, "editMessageText", { chat_id: chat, message_id: cb.message.message_id, text }).catch(() => {}) : null,
      ]);
    const code = cb.data.slice(3);
    if (code === "no") {
      await done("Bekor qilindi.");
      return "link: declined";
    }
    const userId = await consumeLinkCode(code);
    if (!userId) {
      await done("Havola eskirgan yoki allaqachon ishlatilgan.");
      return "link: expired";
    }
    try {
      await linkTelegram(userId, { id: cb.from.id, firstName: cb.from.first_name || "", username: cb.from.username || "" });
      await done("✅ Telegram ulandi. Platformaga qaytib, davom eting.");
      return "link: linked";
    } catch (e) {
      await done(e instanceof HttpError ? `Ulanmadi: ${e.message}` : "Ulanmadi. Qayta urinib ko'ring.");
      return "link: failed";
    }
  }
  return "ignored";
}
