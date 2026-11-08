// Telegram bot logic besides the mini app: commands, keyword replies, inline buttons and question flows.
// Pure and synchronous: it turns an incoming Telegram update into the Telegram API calls to make and the new
// conversation state. The webhook (api/bot/[id]) executes the calls and persists the state, so this is easy to test.
import type { BotConfig, BotFlow, BotMessage } from "./types";

export interface TgCall {
  method: string;
  body: Record<string, unknown>;
}
/** Where a user is inside a flow. */
export interface FlowState {
  flowId: string;
  step: number;
  answers: Record<string, string | number>;
}
export interface BotUpdate {
  message?: {
    chat: { id: number };
    from?: { id: number };
    text?: string;
    contact?: { phone_number?: string };
  };
  callback_query?: {
    id: string;
    data?: string;
    from: { id: number };
    message?: { chat: { id: number } };
  };
}
export interface BotResult {
  calls: TgCall[];
  /** undefined = unchanged, null = clear, object = set. */
  state: FlowState | null | undefined;
  /** Finished flow with answers to store as a record. */
  save?: { flowId: string; collection: string | null; data: Record<string, string | number>; notifyOwner: boolean };
}

export const RESERVED_COMMANDS = ["start", "id", "cancel"];
const MSG = {
  cancelled: "Bekor qilindi.",
  nothing: "Hozir hech qanday so'rovnoma yo'q.",
  number: "Iltimos, raqam kiriting.",
  phone: "Telefon raqamini to'g'ri kiriting (masalan +998901234567).",
  choice: "Iltimos, variantlardan birini tanlang.",
  sharePhone: "Raqamni yuborish",
};

const find = <T extends { id: string }>(list: T[] | undefined, id: string) => (list || []).find((x) => x.id === id);

/** What a button / command / keyword points at: a message or a flow. */
export function resolveTarget(bot: BotConfig, id: string): { kind: "message"; message: BotMessage } | { kind: "flow"; flow: BotFlow } | null {
  const m = find(bot.messages, id);
  if (m) return { kind: "message", message: m };
  const f = find(bot.flows, id);
  return f ? { kind: "flow", flow: f } : null;
}

export function messageCall(bot: BotConfig, chatId: number, m: BotMessage, appUrl: string): TgCall {
  const body: Record<string, unknown> = { chat_id: chatId, text: m.text.trim() || "…" };
  const inline = (m.buttons || [])
    .map((row) =>
      row.filter((b) => b.text.trim()).flatMap((b): Record<string, unknown>[] => {
        if (b.url) return [{ text: b.text, url: b.url }];
        if (b.app) return [{ text: b.text, web_app: { url: appUrl } }];
        const t = b.to ? resolveTarget(bot, b.to) : null;
        if (t) return [{ text: b.text, callback_data: `${t.kind === "flow" ? "f" : "m"}:${b.to}` }];
        return [];
      }),
    )
    .filter((r) => r.length);
  if (inline.length) body.reply_markup = { inline_keyboard: inline };
  else if (m.keyboard?.length) body.reply_markup = { keyboard: m.keyboard.map((r) => r.map((text) => ({ text }))), resize_keyboard: true };
  return { method: "sendMessage", body };
}

function ask(flow: BotFlow, chatId: number, step: number, prefix?: string): TgCall {
  const s = flow.steps[step];
  const body: Record<string, unknown> = { chat_id: chatId, text: (prefix ? prefix + "\n\n" : "") + (s.ask.trim() || "…") };
  if (s.kind === "choice" && s.options?.length) {
    const rows: { text: string }[][] = [];
    for (let i = 0; i < s.options.length; i += 2) rows.push(s.options.slice(i, i + 2).map((text) => ({ text })));
    body.reply_markup = { keyboard: rows, resize_keyboard: true, one_time_keyboard: true };
  } else if (s.kind === "phone") {
    body.reply_markup = { keyboard: [[{ text: MSG.sharePhone, request_contact: true }]], resize_keyboard: true, one_time_keyboard: true };
  } else body.reply_markup = { remove_keyboard: true };
  return { method: "sendMessage", body };
}

function startFlow(flow: BotFlow, chatId: number): BotResult {
  if (!flow.steps.length) return { calls: [{ method: "sendMessage", body: { chat_id: chatId, text: flow.done.trim() || "…" } }], state: null };
  return { calls: [ask(flow, chatId, 0, flow.intro)], state: { flowId: flow.id, step: 0, answers: {} } };
}

function open(bot: BotConfig, chatId: number, targetId: string, appUrl: string): BotResult | null {
  const t = resolveTarget(bot, targetId);
  if (!t) return null;
  return t.kind === "flow" ? startFlow(t.flow, chatId) : { calls: [messageCall(bot, chatId, t.message, appUrl)], state: null };
}

/** Validates one answer. Returns the stored value, or null when it is not acceptable. */
export function parseAnswer(kind: string | undefined, options: string[] | undefined, text: string, phone?: string): string | number | null {
  const t = text.trim();
  switch (kind) {
    case "number": {
      const n = Number(t.replace(/\s/g, "").replace(",", "."));
      return t && Number.isFinite(n) ? n : null;
    }
    case "phone": {
      const raw = phone || t;
      if (!/^\+?[\d\s()-]{7,20}$/.test(raw)) return null;
      const digits = raw.replace(/[^\d]/g, "");
      return "+" + digits;
    }
    case "choice": {
      const hit = (options || []).find((o) => o.toLowerCase() === t.toLowerCase());
      return hit ?? null;
    }
    default:
      return t ? t.slice(0, 500) : null;
  }
}

/**
 * /start and /id are handled by the webhook itself; everything else comes here.
 * `state` is the user's current flow state (if any).
 */
export function handleUpdate(bot: BotConfig, state: FlowState | null, update: BotUpdate, appUrl: string): BotResult {
  const none: BotResult = { calls: [], state: undefined };

  const cb = update.callback_query;
  if (cb) {
    const chatId = cb.message?.chat.id ?? cb.from.id;
    const answer: TgCall = { method: "answerCallbackQuery", body: { callback_query_id: cb.id } };
    const m = /^([mf]):([a-z0-9_-]{1,24})$/.exec(cb.data || "");
    const r = m ? open(bot, chatId, m[2], appUrl) : null;
    return r ? { ...r, calls: [answer, ...r.calls] } : { calls: [answer], state: undefined };
  }

  const msg = update.message;
  if (!msg) return none;
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  const cmd = /^\/([a-zA-Z0-9_]+)(?:@\w+)?(?:\s|$)/.exec(text);
  if (cmd) {
    const name = cmd[1].toLowerCase();
    if (name === "cancel") {
      return { calls: [{ method: "sendMessage", body: { chat_id: chatId, text: state ? MSG.cancelled : MSG.nothing, reply_markup: { remove_keyboard: true } } }], state: null };
    }
    const c = (bot.commands || []).find((x) => x.command === name);
    const r = c ? open(bot, chatId, c.to, appUrl) : null;
    return r || none;
  }

  const flow = state ? find(bot.flows, state.flowId) : undefined;
  if (state && flow) {
    const step = flow.steps[state.step];
    const v = parseAnswer(step.kind, step.options, text, msg.contact?.phone_number);
    if (v === null) {
      const why = step.kind === "number" ? MSG.number : step.kind === "phone" ? MSG.phone : step.kind === "choice" ? MSG.choice : null;
      return { calls: [ask(flow, chatId, state.step, why || undefined)], state: undefined };
    }
    const answers = { ...state.answers, [step.key]: v };
    if (state.step + 1 < flow.steps.length) {
      return { calls: [ask(flow, chatId, state.step + 1)], state: { flowId: flow.id, step: state.step + 1, answers } };
    }
    return {
      calls: [{ method: "sendMessage", body: { chat_id: chatId, text: flow.done.trim() || "…", reply_markup: { remove_keyboard: true } } }],
      state: null,
      save: { flowId: flow.id, collection: flow.saveTo || null, data: answers, notifyOwner: flow.notifyOwner !== false },
    };
  }

  const lower = text.toLowerCase();
  if (lower) {
    const k = (bot.keywords || []).find((x) => x.match.trim() && lower.includes(x.match.trim().toLowerCase()));
    const r = k ? open(bot, chatId, k.to, appUrl) : null;
    if (r) return r;
  }
  const fb = bot.fallback ? open(bot, chatId, bot.fallback, appUrl) : null;
  return fb || none;
}

/** Commands for Telegram's menu (setMyCommands). */
export function commandList(bot: BotConfig) {
  return [
    { command: "start", description: "Ilovani ochish" },
    ...(bot.commands || [])
      .filter((c, i, all) => all.findIndex((x) => x.command === c.command) === i)
      .filter((c) => !RESERVED_COMMANDS.includes(c.command))
      .map((c) => ({ command: c.command, description: c.description.trim().slice(0, 256) || c.command })),
  ];
}

/** Problems in the bot config the author should fix (dangling ids, unknown collections...). */
export function lintBot(bot: BotConfig, recordCollections: string[]): string[] {
  const out: string[] = [];
  const ids = [...(bot.messages || []).map((m) => m.id), ...(bot.flows || []).map((f) => f.id)];
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) out.push(`Bot: takrorlangan id: ${[...new Set(dup)].join(", ")}`);
  const known = new Set(ids);
  const need = (to: string | undefined, where: string) => {
    if (to && !known.has(to)) out.push(`Bot: ${where} mavjud bo'lmagan "${to}" ga ishora qiladi`);
  };
  for (const c of bot.commands || []) {
    need(c.to, `/${c.command}`);
    if (RESERVED_COMMANDS.includes(c.command)) out.push(`Bot: /${c.command} band buyruq`);
  }
  for (const k of bot.keywords || []) need(k.to, `"${k.match}" kalit so'zi`);
  for (const m of bot.messages || []) for (const b of (m.buttons || []).flat()) need(b.to, `"${b.text}" tugmasi`);
  need(bot.fallback, "fallback");
  for (const m of bot.messages || []) if (!m.text.trim()) out.push(`Bot: "${m.id}" xabarining matni bo'sh`);
  for (const k of bot.keywords || []) if (!k.match.trim()) out.push("Bot: bo'sh kalit so'z");
  for (const f of bot.flows || []) {
    if (f.saveTo && !recordCollections.includes(f.saveTo)) out.push(`Bot: "${f.id}" so'rovnomasi yozadigan "${f.saveTo}" kolleksiyasi (mode: records) yo'q`);
    if (!f.steps.length) out.push(`Bot: "${f.id}" so'rovnomasida qadam yo'q`);
    if (!f.done.trim()) out.push(`Bot: "${f.id}" so'rovnomasining yakuniy matni bo'sh`);
    for (const s of f.steps) if (!s.ask.trim()) out.push(`Bot: "${f.id}.${s.key}" savoli bo'sh`);
    const keys = f.steps.map((s) => s.key);
    if (new Set(keys).size !== keys.length) out.push(`Bot: "${f.id}" qadamlarida takroriy kalit`);
    for (const s of f.steps) if (s.kind === "choice" && !s.options?.length) out.push(`Bot: "${f.id}.${s.key}" choice, lekin options yo'q`);
  }
  for (const a of bot.ownerAlerts || []) if (!recordCollections.includes(a.collection)) out.push(`Bot: ownerAlerts "${a.collection}" kolleksiyasi yo'q`);
  return out;
}
