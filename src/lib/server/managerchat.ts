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
import { tgApi } from "./telegram";
import { userByTelegramId } from "./tglink";
import { sessionUserById } from "./users";
import { createClaim, managerConfig, newBotLink } from "./manager";

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

const T = {
  notLinked: (base: string) => `Bu Telegram hali platforma akkauntingizga ulanmagan.\n\nSaytda (${base}) Google bilan kiring: loyiha Sozlamalarida «Telegramni ulash» tugmasini bosing, keyin shu yerga qayting.`,
  menu: "MiniStudio: Telegram ilovalarini shu yerdan boshqaring.",
  noProjects: "Hali loyiha yo'q. «Yangi loyiha» ni bosing.",
  askName: "Yangi loyiha nomini yozing (masalan: Lazzat Kafe). Bekor qilish: /cancel",
  askPrompt: (hasApp: boolean) => (hasApp ? "O'zgartirishni oddiy so'z bilan yozing (masalan: «narxlarni qalinroq qil»). Chiqish: /cancel" : "Ilovani tasvirlang (masalan: «Nukusdagi gul do'koni: katalog, yetkazib berish va Click to'lovi»). Chiqish: /cancel"),
  working: "⏳ AI ishlayapti, 30–90 soniya kuting…",
  busy: "Juda ko'p so'rov. Birozdan keyin urinib ko'ring.",
  cancelled: "Bekor qilindi.",
};

const BASE = () => publicUrl();
const panel = (path: string) => ({ web_app: { url: `${BASE()}/tg?next=${encodeURIComponent(path)}` } });

function menuMarkup(): Markup {
  return {
    inline_keyboard: [
      [{ text: "Loyihalarim", callback_data: "p:list" }, { text: "Yangi loyiha", callback_data: "p:new" }],
      [{ text: "Panelni ochish", ...panel("/dashboard") }],
    ],
  };
}

export function projectCard(p: ProjectRow): string {
  const screens = p.doc?.screens.length || 0;
  return [
    p.name,
    `Ilova: ${screens ? `${screens} ta ekran` : "hali yaratilmagan"}`,
    `Nashr: ${p.publishedVersion ? `v${p.publishedVersion}` : "yo'q"}`,
    `Bot: ${p.botUsername ? "@" + p.botUsername : "ulanmagan"}`,
    ...(p.suspended ? ["Holat: administrator to'xtatgan"] : []),
  ].join("\n");
}

function cardMarkup(p: WithId<ProjectRow>, canEdit: boolean): Markup {
  const id = p._id.toHexString();
  const rows: Record<string, unknown>[][] = [];
  if (canEdit) rows.push([{ text: "AI bilan tahrirlash", callback_data: `a:${id}` }, { text: "Publish", callback_data: `u:${id}` }]);
  rows.push([{ text: "Buyurtmalar", callback_data: `o:${id}` }, { text: "Panelda ochish", ...panel(`/projects/${id}/studio`) }]);
  if (canEdit && !envOf(p).BOT_TOKEN) rows.push([{ text: "Bot yaratish", callback_data: `b:${id}` }]);
  rows.push([{ text: "‹ Loyihalar", callback_data: "p:list" }]);
  return { inline_keyboard: rows };
}

/** One line per record: number, table and the first few plain values. */
export function recordLine(r: { number: number; collection: string; data: unknown }): string {
  const d = r.data && typeof r.data === "object" && !Array.isArray(r.data) ? (r.data as Record<string, unknown>) : { value: r.data };
  const vals = Object.values(d)
    .filter((v) => ["string", "number", "boolean"].includes(typeof v) && String(v) !== "")
    .slice(0, 3)
    .map((v) => String(v).slice(0, 40));
  return `#${r.number} ${r.collection}${vals.length ? ": " + vals.join(" · ") : ""}`;
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
  const send = (text: string, reply_markup?: Markup) => tgApi(m.token, "sendMessage", { chat_id: chat, text, ...(reply_markup ? { reply_markup } : {}) }).catch((e) => console.error("manager send", e.message));
  if (cb) await tgApi(m.token, "answerCallbackQuery", { callback_query_id: cb.id }).catch(() => {});
  if (rateLimited(`mgr:${tgId}`, 40)) {
    await send(T.busy);
    return "rate limited";
  }

  const linked = await userByTelegramId(tgId);
  const user = linked ? await sessionUserById(linked.id) : null;
  if (!user) {
    await send(T.notLinked(BASE()));
    return "not linked";
  }

  const data = cb?.data || "";
  const text = (msg?.text || "").trim();
  try {
    // ----- commands and menu buttons -----
    const cmd = /^\/([a-z_]+)(?:@\w+)?(?:\s|$)/i.exec(text)?.[1]?.toLowerCase();
    if (cmd === "cancel") {
      await setState(tgId, null);
      await send(T.cancelled, menuMarkup());
      return "cancel";
    }
    if (cmd === "start" || cmd === "help" || cmd === "menu") {
      await setState(tgId, null);
      await send(T.menu, menuMarkup());
      return "menu";
    }
    if (cmd === "projects" || data === "p:list") return await listProjects(user, send, tgId);
    if (cmd === "new" || data === "p:new") {
      await setState(tgId, { mode: "new_name" });
      await send(T.askName);
      return "ask name";
    }

    const open = /^([pauobx]):([a-f0-9]{24})$/.exec(data);
    if (open) {
      const [, kind, id] = open;
      if (kind === "p") return await showProject(user, id, send);
      if (kind === "a") {
        const { project } = await projectForUser(user, id, "update");
        await setState(tgId, { mode: "ai", projectId: id });
        await send(`${project.name}\n\n${T.askPrompt(!!project.doc)}`);
        return "ai mode";
      }
      if (kind === "u") return await publish(user, id, send);
      if (kind === "o") return await orders(user, id, send);
      if (kind === "b") return await createBot(user, id, tgId, send);
    }

    // ----- free text: depends on what we are waiting for -----
    if (text && !text.startsWith("/")) {
      const st = await getState(tgId);
      if (st?.mode === "new_name") {
        const id = await createProject(user.id, text);
        await setState(tgId, { mode: "ai", projectId: id });
        await send(`Loyiha yaratildi: ${text.slice(0, 80)}\n\n${T.askPrompt(false)}`);
        return "project created";
      }
      if (st?.mode === "ai") return await runAi(user, st.projectId, text, send, tgId);
      await send(T.menu, menuMarkup());
      return "menu (no state)";
    }
  } catch (e) {
    await send(e instanceof HttpError ? `Bajarilmadi: ${e.message}` : "Xatolik yuz berdi. Qayta urinib ko'ring.");
    if (!(e instanceof HttpError)) console.error("manager chat", e);
    return "error";
  }
  return "ignored";
}

type Send = (text: string, markup?: Markup) => Promise<unknown>;
type User = NonNullable<Awaited<ReturnType<typeof sessionUserById>>>;

async function listProjects(user: User, send: Send, tgId: number) {
  await setState(tgId, null);
  const list = await (await projects())
    .find({ $or: [{ ownerId: user.id }, { "members.userId": user.id }] }, { projection: { history: 0, publishedDoc: 0, envEnc: 0 } })
    .sort({ updatedAt: -1 })
    .limit(30)
    .toArray();
  const mine = list.filter((p) => effectivePermissions(p, user, false)).slice(0, 10);
  await send(
    mine.length ? "Loyihalaringiz:" : T.noProjects,
    { inline_keyboard: [...mine.map((p) => [{ text: p.name.slice(0, 40), callback_data: `p:${p._id.toHexString()}` }]), [{ text: "Yangi loyiha", callback_data: "p:new" }]] },
  );
  return "list";
}

async function showProject(user: User, id: string, send: Send) {
  const { project, perms } = await projectForUser(user, id, "read");
  await send(projectCard(project), cardMarkup(project, perms.update));
  return "card";
}

async function runAi(user: User, id: string, prompt: string, send: Send, tgId: number) {
  if (rateLimited(`mgr:ai:${tgId}`, 10, 10 * 60_000)) {
    await send(T.busy);
    return "ai rate limited";
  }
  const { project, perms } = await projectForUser(user, id, "update");
  const kind = project.doc ? "edit" : "generate";
  const { done } = await startAiJob({ project, user, perms, kind, prompt });
  await send(T.working);
  // Not awaited: the webhook must answer Telegram quickly. The reply is sent when the job finishes.
  void done.then(async (r) => {
    if (!r.ok) return void (await send(`AI xatosi: ${r.error.slice(0, 300)}`));
    const msgText = String(r.result.message || "Tayyor");
    await send(`${msgText}\n\nYana o'zgartirish uchun yozing, yoki quyidagi tugmalardan foydalaning.`, {
      inline_keyboard: [[{ text: "Publish", callback_data: `u:${id}` }, { text: "Panelda ko'rish", ...panel(`/projects/${id}/studio`) }]],
    });
  });
  return `ai ${kind} started`;
}

async function publish(user: User, id: string, send: Send) {
  const { project, perms } = await projectForUser(user, id, "update");
  const r = await publishProject({ p: project, user, perms, base: BASE() });
  const warn = r.warnings.slice(0, 5).map((w) => `• ${w}`).join("\n");
  await send(`Nashr qilindi: v${r.version}\n${r.url}${r.botUsername ? `\nBot: @${r.botUsername}` : ""}${warn ? `\n\nEslatmalar:\n${warn}` : ""}`);
  return "published";
}

async function orders(user: User, id: string, send: Send) {
  const { project } = await projectForUser(user, id, "read");
  const rows = await (await recordsCol()).find({ projectId: id }).sort({ createdAt: -1 }).limit(8).toArray();
  await send(rows.length ? `${project.name}: oxirgi yozuvlar\n\n${rows.map(recordLine).join("\n")}` : `${project.name}: hali yozuv yo'q.`, {
    inline_keyboard: [[{ text: "Hammasi panelda", ...panel(`/projects/${id}/data`) }]],
  });
  return "orders";
}

async function createBot(user: User, id: string, tgId: number, send: Send) {
  const m = managerConfig()!;
  const { project } = await projectForUser(user, id, "update");
  if (envOf(project).BOT_TOKEN) {
    await send("Bu loyihada bot allaqachon ulangan.");
    return "has bot";
  }
  const { suggested } = await createClaim({ projectId: id, userId: user.id, tgId, slug: project.slug, name: project.name });
  await send("Telegram'da bot yaratish ekrani ochiladi. «Yaratish» ni bosing, bot o'zi ulanadi.", {
    inline_keyboard: [[{ text: "Botni yaratish", url: newBotLink(m.username, suggested, project.name) }]],
  });
  return "bot link";
}

