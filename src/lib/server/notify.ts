import "server-only";
import { getBotLang } from "./managerprefs";
import { managerConfig } from "./manager";
import { publicUrl } from "./projects";
import { escapeHtml, tgApi } from "./telegram";
import { getTelegramLink } from "./tglink";
import { BOT_DICT } from "../managerI18n";

/** Only jobs that took at least this long are announced: quick ones finish while the person is still looking. */
export const NOTIFY_AFTER_MS = Number(process.env.NOTIFY_AFTER_MS) || 20_000;
/** A page that polled the job this recently is open and will announce the result itself. */
const WATCHED_MS = 15_000;

export interface JobSeen {
  at?: Date | string;
  /** 2 = the tab is visible, 1 = hidden but will show a browser notification, 0 = hidden and silent */
  w?: number;
}

/** Should Telegram announce the finished job? Not when it was quick, or when an open page is taking care of it. */
export function shouldNotify(o: { durationMs: number; seen?: JobSeen | null; now?: number }): boolean {
  if (o.durationMs < NOTIFY_AFTER_MS) return false;
  const at = o.seen?.at ? new Date(o.seen.at).getTime() : 0;
  const watched = at > 0 && (o.now ?? Date.now()) - at < WATCHED_MS && (o.seen?.w ?? 0) >= 1;
  return !watched;
}

/** Tells the person in Telegram (through the manager bot) that their AI request finished. Never throws. */
export async function notifyJobDone(o: { userId: string; projectId: string; name: string; ok: boolean }): Promise<boolean> {
  try {
    const m = managerConfig();
    const link = await getTelegramLink(o.userId);
    if (!m || !link) return false;
    const t = BOT_DICT[await getBotLang(link.id)];
    const name = escapeHtml(o.name);
    await tgApi(m.token, "sendMessage", {
      chat_id: link.id,
      parse_mode: "HTML",
      text: o.ok ? t.notice.ready(name) : t.notice.failed(name),
      reply_markup: { inline_keyboard: [[{ text: t.notice.open, web_app: { url: `${publicUrl()}/tg?next=${encodeURIComponent(`/projects/${o.projectId}/studio`)}` } }]] },
    });
    return true;
  } catch {
    return false;
  }
}
