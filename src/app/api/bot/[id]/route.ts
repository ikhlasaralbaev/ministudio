import { safeEqual } from "@/lib/server/safeEqual";
import { encryptEnv } from "@/lib/server/crypto";
import { envOf, getProject, projects, publicUrl, SUSPENDED_TEXT } from "@/lib/server/projects";
import { escapeHtml, tgApi } from "@/lib/server/telegram";
import { botSecret, ownerCode } from "@/lib/server/runtime";
import { handleUpdate, type BotUpdate } from "@/lib/bot";
import { decideRecord, finishFlow, getFlowState, setFlowState } from "@/lib/server/botops";
import { trackTgUser } from "@/lib/server/appdata";
import { effectivePermissions } from "@/lib/permissions";
import { userByTelegramId } from "@/lib/server/tglink";
import { sessionUserById } from "@/lib/server/users";
import { getBotLang } from "@/lib/server/managerprefs";
import { BOT_DICT } from "@/lib/managerI18n";

// Telegram webhook. Always answer 200 quickly so Telegram doesn't retry.
export async function POST(req: Request, ctx: RouteContext<"/api/bot/[id]">) {
  const { id } = await ctx.params;
  if (!safeEqual(req.headers.get("x-telegram-bot-api-secret-token"), botSecret(id))) return new Response("forbidden", { status: 403 });
  try {
    const p = await getProject(id);
    if (!p?.publishedDoc) return new Response("ok");
    const env = envOf(p);
    const token = env.BOT_TOKEN;
    if (!token) return new Response("ok");
    const update = await req.json();
    const msg = update.message;
    const cbq = update.callback_query;
    const text: string = msg?.text || "";
    const chatId = msg?.chat?.id;
    const projectId = id;

    // Owner pressed Accept / Reject under an order alert.
    const decision = /^o:([a-f0-9]{24}):([ar])$/.exec(cbq?.data || "");
    if (cbq && decision) {
      const isOwner = !!env.OWNER_CHAT_ID && String(cbq.from?.id) === env.OWNER_CHAT_ID;
      const note = isOwner ? await decideRecord(projectId, env, p.publishedDoc, decision[1], decision[2] as "a" | "r") : "Faqat ega uchun";
      await tgApi(token, "answerCallbackQuery", { callback_query_id: cbq.id, text: note }).catch(() => {});
      if (isOwner && cbq.message)
        await tgApi(token, "editMessageReplyMarkup", { chat_id: cbq.message.chat.id, message_id: cbq.message.message_id, reply_markup: { inline_keyboard: [] } }).catch(() => {});
      return new Response("ok");
    }

    const from = msg?.from || cbq?.from;
    if (from && !p.suspended) await trackTgUser(projectId, from).catch(() => {});
    if (cbq && !msg) {
      // Button presses and answers from bot messages: run through the bot's flows and messages.
      if (p.suspended) {
        await tgApi(token, "answerCallbackQuery", { callback_query_id: cbq.id, text: SUSPENDED_TEXT }).catch(() => {});
        return new Response("ok");
      }
      await runBot(token, p, env, update, `${publicUrl(req)}/app/${p.slug}`);
      return new Response("ok");
    }
    if (!chatId) return new Response("ok");

    const appUrl = `${publicUrl(req)}/app/${p.slug}`;
    const bot = p.publishedDoc.bot;

    if (text.startsWith("/start")) {
      const arg = text.split(" ")[1] || "";
      // The owner connects either with the owner link (start=owner_<code>), or simply by pressing Start when this Telegram
      // account is linked to a platform account that may edit the project (and nobody is connected yet).
      let becomeOwner = arg === `owner_${ownerCode(id)}`;
      if (!becomeOwner && !env.OWNER_CHAT_ID && msg.from?.id) {
        const linked = await userByTelegramId(msg.from.id).catch(() => null);
        const user = linked ? await sessionUserById(linked.id).catch(() => null) : null;
        becomeOwner = !!user && !!effectivePermissions(p, user, false)?.update;
      }
      // Owner preset at creation (the creator's id): confirm once on their first Start.
      const presetOwner = !becomeOwner && env.OWNER_CHAT_ID === String(chatId) && !env.OWNER_CONFIRMED;
      if (becomeOwner || presetOwner) {
        env.OWNER_CHAT_ID = String(chatId);
        env.OWNER_CONFIRMED = "1";
        await (await projects()).updateOne({ _id: p._id }, { $set: { envEnc: encryptEnv(env) } });
        await tgApi(token, "sendMessage", {
          chat_id: chatId,
          parse_mode: "HTML",
          text: BOT_DICT[await getBotLang(msg.from?.id)].ownerLinked,
        });
        // no early return: the new owner also gets the normal welcome with the app button, to try the app right away
      }
      if (p.suspended) {
        await tgApi(token, "sendMessage", { chat_id: chatId, text: SUSPENDED_TEXT });
        return new Response("ok");
      }
      await tgApi(token, "sendMessage", {
        chat_id: chatId,
        text: bot?.welcomeText || "Xush kelibsiz!",
        reply_markup: {
          inline_keyboard: [[{ text: bot?.buttonText || "Ochish", web_app: { url: appUrl } }]],
        },
      });
    } else if (text.startsWith("/id")) {
      await tgApi(token, "sendMessage", {
        chat_id: chatId,
        text: `Chat ID: <code>${escapeHtml(String(chatId))}</code>`,
        parse_mode: "HTML",
      });
    } else if (p.suspended) {
      await tgApi(token, "sendMessage", { chat_id: chatId, text: SUSPENDED_TEXT });
    } else {
      await runBot(token, p, env, update, appUrl);
    }
  } catch (e) {
    console.error("bot webhook", e);
  }
  return new Response("ok");
}

type Proj = NonNullable<Awaited<ReturnType<typeof getProject>>>;

/** Commands, keyword replies, buttons and flows from the project's bot config. */
async function runBot(token: string, p: Proj, env: Record<string, string>, update: BotUpdate, appUrl: string) {
  const doc = p.publishedDoc!;
  const projectId = p._id.toHexString();
  const chatId = update.message?.chat.id ?? update.callback_query?.message?.chat.id ?? update.callback_query?.from.id;
  if (!chatId) return;
  const state = await getFlowState(projectId, chatId);
  const r = handleUpdate(doc.bot, state, update, appUrl);
  for (const c of r.calls) await tgApi(token, c.method, c.body).catch((e) => console.error("bot call", c.method, e.message));
  if (r.state !== undefined) await setFlowState(projectId, chatId, r.state);
  if (r.save) {
    const from = (update.message?.from || update.callback_query?.from) as never;
    await finishFlow(projectId, env, doc, r.save, from);
  }
}
