import "server-only";
import type { WithId } from "mongodb";
import { effectivePermissions } from "../permissions";
import { db } from "./db";
import { projectForUser } from "./access";
import { startAiJob } from "./aiflow";
import { HttpError } from "./http";
import { createProject, envOf, projects, publicUrl, type ProjectRow } from "./projects";
import { recordsCol } from "./appdata";
import { publishProject } from "./publish";
import { rateLimited } from "./runtime";
import { escapeHtml as esc, tgApi } from "./telegram";
import { userByTelegramId } from "./tglink";
import { sessionUserById } from "./users";
import { createClaim, managerConfig, newBotLink } from "./manager";
import { BOT_DICT, BOT_LANGS, BOT_LANG_NAME, isBotLang, type BotDict, type BotLang } from "../managerI18n";
import { getBotLang, setBotLang } from "./managerprefs";

/**
 * The manager bot as a chat console: list projects, create one, describe or change the app in plain words (AI),
 * publish, see the latest orders, and open the full panel inside Telegram. Everything runs as the platform account
 * that linked this Telegram, with that account's project rights.
 */

type Markup = { inline_keyboard: Record<string, unknown>[][] };
type ChatState = { mode: "new_name" } | { mode: "ai"; projectId: string };

const stateCol = async () => (await db()).collection<{ tgId: number; state: ChatState; updatedAt: Date }>("manager_chat");
async function getState(tgId: number): Promise<ChatState | null> {
  return (await (await stateCol()).findOne({ tgId }))?.state ?? null;
}
async function setState(tgId: number, state: ChatState | null) {
  const c = await stateCol();
  await c.createIndex({ updatedAt: 1 }, { expireAfterSeconds: 6 * 3600 });
  if (!state) await c.deleteOne({ tgId });
  else await c.updateOne({ tgId }, { $set: { state, updatedAt: new Date() } }, { upsert: true });
}

const BASE = () => publicUrl();
const panel = (path: string) => ({ web_app: { url: `${BASE()}/tg?next=${encodeURIComponent(path)}` } });

function menuMarkup(t: BotDict): Markup {
  return {
    inline_keyboard: [
      [{ text: t.btn.projects, callback_data: "p:list" }, { text: t.btn.newProject, callback_data: "p:new" }],
      [{ text: t.btn.panel, ...panel("/dashboard") }],
    ],
  };
}

export function projectCard(t: BotDict, p: ProjectRow): string {
  return t.card({ name: esc(p.name), screens: p.doc?.screens.length || 0, version: p.publishedVersion || 0, bot: p.botUsername ?? null, suspended: !!p.suspended });
}

function cardMarkup(t: BotDict, p: WithId<ProjectRow>, canEdit: boolean): Markup {
  const id = p._id.toHexString();
  const rows: Record<string, unknown>[][] = [];
  if (canEdit) rows.push([{ text: t.btn.edit, callback_data: `a:${id}` }, { text: t.btn.publish, callback_data: `u:${id}` }]);
  rows.push([{ text: t.btn.orders, callback_data: `o:${id}` }, { text: t.btn.openInPanel, ...panel(`/projects/${id}/studio`) }]);
  if (canEdit && !envOf(p).BOT_TOKEN) rows.push([{ text: t.btn.createBot, callback_data: `b:${id}` }]);
  rows.push([{ text: t.btn.back, callback_data: "p:list" }]);
  return { inline_keyboard: rows };
}

/** Server warnings are written in Uzbek; the known ones are shown in the chat language. */
export function localizeWarning(t: BotDict, w: string): string {
  if (w.startsWith("Bot token kiritilmagan")) return t.warn.noToken;
  if (w.startsWith("Telegram faqat https")) return t.warn.https;
  if (w.startsWith("Egasi (OWNER_CHAT_ID)")) return t.warn.noOwner;
  return w;
}

/** One record as a short HTML block: bold number and table, then its first few plain values. */
export function recordHtml(r: { number: number; collection: string; data: unknown }): string {
  const d = r.data && typeof r.data === "object" && !Array.isArray(r.data) ? (r.data as Record<string, unknown>) : { value: r.data };
  const vals = Object.values(d)
    .filter((v) => ["string", "number", "boolean"].includes(typeof v) && String(v) !== "")
    .slice(0, 3)
    .map((v) => esc(String(v).slice(0, 40)));
  return `<b>#${r.number}</b> ${esc(r.collection)}${vals.length ? `\n<i>${vals.join(" · ")}</i>` : ""}`;
}

type Send = (text: string, markup?: Markup) => Promise<unknown>;
type User = NonNullable<Awaited<ReturnType<typeof sessionUserById>>>;
interface Ctx {
  user: User;
  t: BotDict;
  send: Send;
  tgId: number;
}

export async function handleManagerChat(update: {
  message?: { chat?: { id?: number }; from?: { id?: number; first_name?: string }; text?: string };
  callback_query?: { id: string; data?: string; from: { id: number }; message?: { chat?: { id?: number } } };
}): Promise<string> {
  const m = managerConfig();
  if (!m) return "no manager";
  const cb = update.callback_query;
  const msg = update.message;
  const tgId = cb?.from.id ?? msg?.from?.id;
  const chat = cb?.message?.chat?.id ?? msg?.chat?.id ?? tgId;
  if (!tgId || !chat) return "ignored";
  const lang = await getBotLang(tgId);
  const t = BOT_DICT[lang];
  const send: Send = (text, reply_markup) =>
    tgApi(m.token, "sendMessage", { chat_id: chat, text, parse_mode: "HTML", link_preview_options: { is_disabled: true }, ...(reply_markup ? { reply_markup } : {}) }).catch((e) =>
      console.error("manager send", e.message),
    );
  if (cb) await tgApi(m.token, "answerCallbackQuery", { callback_query_id: cb.id }).catch(() => {});
  if (rateLimited(`mgr:${tgId}`, 40)) {
    await send(t.busy);
    return "rate limited";
  }

  const data = cb?.data || "";
  const text = (msg?.text || "").trim();
  const cmd = /^\/([a-z_]+)(?:@\w+)?(?:\s|$)/i.exec(text)?.[1]?.toLowerCase();

  // language choice works before the account is linked, too
  if (cmd === "language" || cmd === "lang") {
    await send(t.langPrompt, { inline_keyboard: [BOT_LANGS.map((l) => ({ text: BOT_LANG_NAME[l], callback_data: `l:${l}` }))] });
    return "language prompt";
  }
  const pick = /^l:([a-z]+)$/.exec(data)?.[1];
  if (pick && isBotLang(pick)) {
    await setBotLang(tgId, pick);
    const nt = BOT_DICT[pick as BotLang];
    await send(nt.langSet);
    await send(nt.menu, menuMarkup(nt));
    return "language set";
  }

  const linked = await userByTelegramId(tgId);
  const user = linked ? await sessionUserById(linked.id) : null;
  if (!user) {
    await send(t.notLinked(esc(BASE())));
    return "not linked";
  }
  const c: Ctx = { user, t, send, tgId };

  try {
    // ----- commands and menu buttons -----
    if (cmd === "cancel") {
      await setState(tgId, null);
      await send(t.cancelled, menuMarkup(t));
      return "cancel";
    }
    if (cmd === "start" || cmd === "help" || cmd === "menu") {
      await setState(tgId, null);
      await send(t.menu, menuMarkup(t));
      return "menu";
    }
    if (cmd === "projects" || data === "p:list") return await listProjects(c);
    if (cmd === "new" || data === "p:new") {
      await setState(tgId, { mode: "new_name" });
      await send(t.askName);
      return "ask name";
    }

    const open = /^([pauobx]):([a-f0-9]{24})$/.exec(data);
    if (open) {
      const [, kind, id] = open;
      if (kind === "p") return await showProject(c, id);
      if (kind === "a") {
        const { project } = await projectForUser(user, id, "update");
        await setState(tgId, { mode: "ai", projectId: id });
        await send(project.doc ? t.askPromptEdit(esc(project.name)) : t.askPromptNew);
        return "ai mode";
      }
      if (kind === "u") return await publish(c, id);
      if (kind === "o") return await orders(c, id);
      if (kind === "b") return await createBot(c, id);
    }

    // ----- free text: depends on what we are waiting for -----
    if (text && !text.startsWith("/")) {
      const st = await getState(tgId);
      if (st?.mode === "new_name") {
        const id = await createProject(user.id, text);
        await setState(tgId, { mode: "ai", projectId: id });
        await send(`${t.projectCreated(esc(text.slice(0, 80)))}\n\n${t.askPromptNew}`);
        return "project created";
      }
      if (st?.mode === "ai") return await runAi(c, st.projectId, text);
      await send(t.menu, menuMarkup(t));
      return "menu (no state)";
    }
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 0;
    await send(t.failed(status === 404 ? t.err.notFound : status === 403 ? t.err.noRights : t.err.generic));
    if (!(e instanceof HttpError)) console.error("manager chat", e);
    return "error";
  }
  return "ignored";
}

async function listProjects({ user, t, send, tgId }: Ctx) {
  await setState(tgId, null);
  const list = await (await projects())
    .find({ $or: [{ ownerId: user.id }, { "members.userId": user.id }] }, { projection: { history: 0, publishedDoc: 0, envEnc: 0 } })
    .sort({ updatedAt: -1 })
    .limit(30)
    .toArray();
  const mine = list.filter((p) => effectivePermissions(p, user, false)).slice(0, 10);
  await send(mine.length ? t.listTitle : t.noProjects, {
    inline_keyboard: [...mine.map((p) => [{ text: p.name.slice(0, 40), callback_data: `p:${p._id.toHexString()}` }]), [{ text: t.btn.newProject, callback_data: "p:new" }]],
  });
  return "list";
}

async function showProject({ user, t, send }: Ctx, id: string) {
  const { project, perms } = await projectForUser(user, id, "read");
  await send(projectCard(t, project), cardMarkup(t, project, perms.update));
  return "card";
}

async function runAi({ user, t, send, tgId }: Ctx, id: string, prompt: string) {
  if (rateLimited(`mgr:ai:${tgId}`, 10, 10 * 60_000)) {
    await send(t.busy);
    return "ai rate limited";
  }
  const { project, perms } = await projectForUser(user, id, "update");
  const kind = project.doc ? "edit" : "generate";
  const { done } = await startAiJob({ project, user, perms, kind, prompt });
  await send(t.working);
  // Not awaited: the webhook must answer Telegram quickly. The reply is sent when the job finishes.
  void done.then(async (r) => {
    if (!r.ok) return void (await send(t.aiError(esc(r.error.slice(0, 300)))));
    // "generate" reports in the chat language; an edit's summary comes from the AI in the language the user wrote in
    const doc = r.result.doc as { screens?: unknown[] } | undefined;
    const summary = kind === "generate" ? t.aiGenerated(doc?.screens?.length || 0) : String(r.result.message || "OK");
    await send(t.aiDone(esc(summary)), {
      inline_keyboard: [[{ text: t.btn.publish, callback_data: `u:${id}` }, { text: t.btn.viewInPanel, ...panel(`/projects/${id}/studio`) }]],
    });
  });
  return `ai ${kind} started`;
}

async function publish({ user, t, send }: Ctx, id: string) {
  const { project, perms } = await projectForUser(user, id, "update");
  const r = await publishProject({ p: project, user, perms, base: BASE() });
  const warn = r.warnings.slice(0, 5).map((w) => `• ${esc(localizeWarning(t, w))}`).join("\n");
  await send(`${t.published(r.version, esc(r.url), r.botUsername)}${warn ? `\n\n${t.warnings}\n${warn}` : ""}`);
  return "published";
}

async function orders({ user, t, send }: Ctx, id: string) {
  const { project } = await projectForUser(user, id, "read");
  const rows = await (await recordsCol()).find({ projectId: id }).sort({ createdAt: -1 }).limit(8).toArray();
  const name = esc(project.name);
  await send(rows.length ? `${t.ordersTitle(name)}\n\n${rows.map(recordHtml).join("\n\n")}` : t.noRecords(name), {
    inline_keyboard: [[{ text: t.btn.allInPanel, ...panel(`/projects/${id}/data`) }]],
  });
  return "orders";
}

async function createBot({ user, t, send, tgId }: Ctx, id: string) {
  const m = managerConfig()!;
  const { project } = await projectForUser(user, id, "update");
  if (envOf(project).BOT_TOKEN) {
    await send(t.botHas);
    return "has bot";
  }
  const { suggested } = await createClaim({ projectId: id, userId: user.id, tgId, slug: project.slug, name: project.name });
  await send(t.botCreate, { inline_keyboard: [[{ text: t.btn.createBotNow, url: newBotLink(m.username, suggested, project.name) }]] });
  return "bot link";
}
