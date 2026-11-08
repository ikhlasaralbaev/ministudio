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
import { ownerCode, rateLimited } from "./runtime";
import { escapeHtml as esc, tgApi } from "./telegram";
import { ensureTelegramUser, isTelegramOnly } from "./tglink";
import { looksLikeIdea, nameFromIdea } from "../idea";
import { sessionUserById } from "./users";
import { createClaim, managerConfig, newBotLink } from "./manager";
import { MAX_UPLOAD } from "./imaging";
import { peekStaged, promoteStaged, stageAsset } from "./assets";
import { tgDownload } from "./tgfile";
import { BOT_DICT, BOT_LANGS, BOT_LANG_NAME, isBotLang, type BotDict, type BotLang } from "../managerI18n";
import { getBotLang, setBotLang } from "./managerprefs";

/**
 * The manager bot as a chat console: list projects, create one, describe or change the app in plain words (AI),
 * publish, see the latest orders, and open the full panel inside Telegram. Everything runs as the platform account
 * that linked this Telegram, with that account's project rights.
 */

type Markup = { inline_keyboard: Record<string, unknown>[][] };
// refs = staged photo ids (idea) or asset ids (ai) waiting to go to the AI with the next message
type ChatState = { mode: "idea"; refs?: string[] } | { mode: "ai"; projectId: string; refs?: string[] };

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

function menuMarkup(t: BotDict, opts?: { haveAccount?: boolean }): Markup {
  return {
    inline_keyboard: [
      [{ text: t.btn.projects, callback_data: "p:list" }, { text: t.btn.newProject, callback_data: "p:new" }],
      [{ text: t.btn.panel, ...panel("/dashboard") }],
      // An account that exists only here cannot see projects made on the site with Google: point it to the site, where
      // "Link Telegram" on the dashboard merges the two.
      ...(opts?.haveAccount ? [[{ text: t.btn.haveAccount, url: `${BASE()}/dashboard` }]] : []),
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
  message?: {
    chat?: { id?: number };
    from?: { id?: number; first_name?: string; username?: string };
    text?: string;
    caption?: string;
    photo?: { file_id: string; file_size?: number }[];
    document?: { file_id: string; mime_type?: string; file_size?: number };
  };
  callback_query?: { id: string; data?: string; from: { id: number; first_name?: string; username?: string }; message?: { chat?: { id?: number } } };
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

  // Telegram-first: whoever writes to the bot has an account (created on the first message, no Google needed).
  const who = cb?.from ?? msg?.from;
  const account = await ensureTelegramUser({ id: tgId, first_name: who?.first_name, username: who?.username });
  const user = await sessionUserById(account.id);
  if (!user) {
    await send(t.blocked);
    return "blocked";
  }
  const c: Ctx = { user, t, send, tgId };

  try {
    // ----- a photo or an image file: a logo or a reference -----
    const img = imageOf(msg);
    if (img) return await onPhoto(c, img, msg?.caption?.trim());
    const ig = /^ig:([a-f0-9]{24}):([lr])$/.exec(data);
    if (ig) return await choosePhoto(c, ig[1], ig[2] === "l" ? "logo" : "reference");
    const ia = /^ia:([a-f0-9]{24})$/.exec(data);
    if (ia) return await runAi(c, ia[1], t.photo.applyPrompt);

    // ----- commands and menu buttons -----
    if (cmd === "cancel") {
      await setState(tgId, null);
      await send(t.cancelled, menuMarkup(t));
      return "cancel";
    }
    if (cmd === "start" || cmd === "help" || cmd === "menu") {
      await setState(tgId, null);
      await send(t.menu, menuMarkup(t, { haveAccount: isTelegramOnly(user.email) }));
      return "menu";
    }
    if (cmd === "projects" || data === "p:list") return await listProjects(c);
    if (cmd === "new" || data === "p:new") {
      await setState(tgId, { mode: "idea" });
      await send(t.askIdea);
      return "ask idea";
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
      if (st?.mode === "ai") {
        const refs = st.refs;
        if (refs?.length) await setState(tgId, { mode: "ai", projectId: st.projectId }); // used once
        return await runAi(c, st.projectId, text, refs);
      }
      // one message is enough: a described idea becomes a project and the app is generated at once
      if (st?.mode === "idea" || looksLikeIdea(text)) {
        const id = await createProject(user.id, nameFromIdea(text), { autoName: true });
        await setState(tgId, { mode: "ai", projectId: id });
        // photos sent before the idea become this project's references
        const refs = st?.mode === "idea" ? await adoptStaged(st.refs, id, user.id) : [];
        return await runAi(c, id, text, refs);
      }
      await send(t.shortIdea, menuMarkup(t));
      return "short message";
    }
  } catch (e) {
    const status = e instanceof HttpError ? e.status : 0;
    await send(t.failed(status === 404 ? t.err.notFound : status === 403 ? t.err.noRights : status === 429 ? t.err.limit : t.err.generic));
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

async function runAi({ user, t, send, tgId }: Ctx, id: string, prompt: string, refs?: string[]) {
  if (rateLimited(`mgr:ai:${tgId}`, 10, 10 * 60_000)) {
    await send(t.busy);
    return "ai rate limited";
  }
  const { project, perms } = await projectForUser(user, id, "update");
  const kind = project.doc ? "edit" : "generate";
  const hasBot = !!envOf(project).BOT_TOKEN;
  const { done } = await startAiJob({ project, user, perms, kind, prompt, refs });
  await send(t.working);
  // Not awaited: the webhook must answer Telegram quickly. The reply is sent when the job finishes.
  void done.then(async (r) => {
    if (!r.ok) return void (await send(t.aiError(esc(r.error.slice(0, 300)))));
    // "generate" reports in the chat language; an edit's summary comes from the AI in the language the user wrote in
    const doc = r.result.doc as { screens?: unknown[]; name?: string } | undefined;
    const summary = kind === "generate" ? t.aiGenerated(doc?.screens?.length || 0, doc?.name || project.name) : String(r.result.message || "OK");
    await send(`${t.aiDone(esc(summary))}${hasBot ? "" : `\n\n${t.nextBot}`}`, {
      // Publish comes first and always works (with or without a bot); creating the bot is a separate, optional step
      inline_keyboard: [
        [{ text: t.btn.publish, callback_data: `u:${id}` }, { text: t.btn.viewInPanel, ...panel(`/projects/${id}/studio`) }],
        ...(hasBot ? [] : [[{ text: t.btn.createBot, callback_data: `b:${id}` }]]),
      ],
    });
  });
  return `ai ${kind} started`;
}

async function publish({ user, t, send }: Ctx, id: string) {
  const { project, perms } = await projectForUser(user, id, "update");
  const r = await publishProject({ p: project, user, perms, base: BASE() });
  const warn = r.warnings.slice(0, 5).map((w) => `• ${esc(localizeWarning(t, w))}`).join("\n");
  const hasBot = !!r.botUsername;
  await send(`${t.published(r.version, esc(r.url), r.botUsername)}${warn ? `\n\n${t.warnings}\n${warn}` : ""}`, {
    inline_keyboard: [
      ...(hasBot
        ? [
            [{ text: t.btnOpenBot, url: `https://t.me/${r.botUsername}` }],
            // no owner yet: one tap (Start with the owner code) connects whoever presses it as the owner
            ...(envOf(project).OWNER_CONFIRMED ? [] : [[{ text: t.btnBecomeOwner, url: `https://t.me/${r.botUsername}?start=owner_${ownerCode(id)}` }]]),
          ]
        : [[{ text: t.btn.createBot, callback_data: `b:${id}` }]]),
      [{ text: t.btn.viewInPanel, ...panel(`/projects/${id}/studio`) }],
    ],
  });
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

/* ---------- photos ---------- */

function imageOf(msg: { photo?: { file_id: string; file_size?: number }[]; document?: { file_id: string; mime_type?: string; file_size?: number } } | undefined) {
  if (msg?.photo?.length) {
    const p = msg.photo[msg.photo.length - 1]; // the largest size Telegram made
    return { fileId: p.file_id, size: p.file_size };
  }
  const d = msg?.document;
  if (d && /^image\/(png|jpeg|webp|gif)$/.test(d.mime_type || "")) return { fileId: d.file_id, size: d.file_size };
  return null;
}

/** Staged photos of this person become references of the project; returns the new asset ids. */
async function adoptStaged(ids: string[] | undefined, projectId: string, userId: string): Promise<string[]> {
  const out: string[] = [];
  for (const sid of ids || []) {
    try {
      out.push((await promoteStaged({ id: sid, kind: "reference", projectId, by: userId })).id);
    } catch {
      /* expired: skip */
    }
  }
  return out;
}

/**
 * A photo arrived. With a project open (AI mode) the person decides: logo or reference. Without one it can only be a
 * reference for the next idea: it waits, and the next described idea (or a caption that is one) creates the app from it.
 */
async function onPhoto(c: Ctx, img: { fileId: string; size?: number }, caption?: string) {
  const { user, t, send, tgId } = c;
  const m = managerConfig()!;
  if (img.size && img.size > MAX_UPLOAD) {
    await send(t.photo.tooBig);
    return "photo too big";
  }
  const buf = await tgDownload(m.token, img.fileId, MAX_UPLOAD).catch(() => null);
  if (buf === "too_big") {
    await send(t.photo.tooBig);
    return "photo too big";
  }
  if (!buf) {
    await send(t.photo.failed);
    return "photo failed";
  }
  const st = await getState(tgId);
  if (st?.mode === "ai") {
    await projectForUser(user, st.projectId, "update");
    const sid = await stageAsset({ projectId: st.projectId, input: buf, by: user.id, caption });
    await send(t.photo.ask, { inline_keyboard: [[{ text: t.photo.logo, callback_data: `ig:${sid}:l` }, { text: t.photo.reference, callback_data: `ig:${sid}:r` }]] });
    return "photo staged";
  }
  const sid = await stageAsset({ projectId: null, input: buf, by: user.id });
  const refs = [...(st?.mode === "idea" ? st.refs || [] : []), sid].slice(-5);
  if (caption && looksLikeIdea(caption)) {
    const id = await createProject(user.id, nameFromIdea(caption), { autoName: true });
    await setState(tgId, { mode: "ai", projectId: id });
    return await runAi(c, id, caption, await adoptStaged(refs, id, user.id));
  }
  await setState(tgId, { mode: "idea", refs });
  await send(t.photo.refForIdea(refs.length));
  return "photo for idea";
}

/** The person said what a staged photo is. */
async function choosePhoto(c: Ctx, stagedId: string, kind: "logo" | "reference") {
  const { user, t, send, tgId } = c;
  const s = await peekStaged(stagedId, user.id);
  if (!s?.projectId) {
    await send(t.photo.failed);
    return "photo gone";
  }
  await projectForUser(user, s.projectId, "update");
  const asset = await promoteStaged({ id: stagedId, kind, projectId: s.projectId, by: user.id });
  if (kind === "logo") {
    await send(t.photo.logoSaved(asset.color), { inline_keyboard: [[{ text: t.photo.apply, callback_data: `ia:${s.projectId}` }]] });
    return "logo saved";
  }
  if (s.caption) return await runAi(c, s.projectId, s.caption, [asset.id]); // the caption was the request
  await setState(tgId, { mode: "ai", projectId: s.projectId, refs: [asset.id] });
  await send(t.photo.refSaved);
  return "reference saved";
}
