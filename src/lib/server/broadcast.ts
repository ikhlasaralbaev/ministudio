import "server-only";
import { ObjectId } from "mongodb";
import { db } from "./db";
import { tgUsersCol } from "./appdata";
import { HttpError } from "./http";

export const MAX_PER_DAY = 3;
const GAP_MS = 50; // ~20 messages/s, under Telegram's 30/s limit
const STALE_MS = 30 * 60 * 1000;

export interface BroadcastDoc {
  _id: ObjectId;
  projectId: string;
  text: string;
  button?: { text: string; url: string };
  by: string;
  status: "running" | "done" | "error";
  total: number;
  sent: number;
  failed: number;
  blocked: number;
  createdAt: Date;
  finishedAt?: Date;
}

const col = async () => (await db()).collection<BroadcastDoc>("broadcasts");

/** People who can still be messaged: they opened the bot or app and have not blocked the bot. */
export async function audienceSize(projectId: string) {
  return (await tgUsersCol()).countDocuments({ projectId, blocked: { $ne: true } } as never);
}

export async function listBroadcasts(projectId: string) {
  return (await col()).find({ projectId }).sort({ createdAt: -1 }).limit(5).toArray();
}

async function send(token: string, chatId: number, text: string, button?: { text: string; url: string }) {
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      ...(button ? { reply_markup: { inline_keyboard: [[{ text: button.text, url: button.url }]] } } : {}),
    }),
  });
  const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error_code?: number; parameters?: { retry_after?: number } };
  return j;
}

/**
 * Starts sending `text` to every reachable user of the project and returns at once; sending continues in this
 * process (the hosting proxy would cut a long request). Guards: one running broadcast per project, MAX_PER_DAY a day.
 */
export async function startBroadcast(p: {
  projectId: string;
  token: string;
  text: string;
  button?: { text: string; url: string };
  by: string;
}) {
  const c = await col();
  const running = await c.findOne({ projectId: p.projectId, status: "running", createdAt: { $gt: new Date(Date.now() - STALE_MS) } });
  if (running) throw new HttpError("Oldingi xabar hali yuborilmoqda", 409);
  const today = await c.countDocuments({ projectId: p.projectId, createdAt: { $gt: new Date(Date.now() - 86_400_000) } });
  if (today >= MAX_PER_DAY) throw new HttpError(`Kuniga ko'pi bilan ${MAX_PER_DAY} ta ommaviy xabar yuborish mumkin`, 429);
  const total = await audienceSize(p.projectId);
  if (!total) throw new HttpError("Xabar yuboriladigan foydalanuvchi yo'q", 400);

  const _id = new ObjectId();
  await c.insertOne({
    _id, projectId: p.projectId, text: p.text, button: p.button, by: p.by,
    status: "running", total, sent: 0, failed: 0, blocked: 0, createdAt: new Date(),
  });

  void (async () => {
    const users = await tgUsersCol();
    let sent = 0, failed = 0, blocked = 0, i = 0;
    const flush = () => c.updateOne({ _id }, { $set: { sent, failed, blocked } });
    try {
      const cursor = users.find({ projectId: p.projectId, blocked: { $ne: true } } as never).project({ tgId: 1 });
      for await (const u of cursor) {
        for (let attempt = 0; attempt < 3; attempt++) {
          const j = await send(p.token, (u as unknown as { tgId: number }).tgId, p.text, p.button);
          if (j.ok) { sent++; break; }
          if (j.error_code === 429) { await new Promise((r) => setTimeout(r, ((j.parameters?.retry_after ?? 2) + 1) * 1000)); continue; }
          if (j.error_code === 403) {
            blocked++;
            await users.updateOne({ projectId: p.projectId, tgId: (u as unknown as { tgId: number }).tgId }, { $set: { blocked: true } } as never);
          } else failed++;
          break;
        }
        if (++i % 10 === 0) await flush();
        await new Promise((r) => setTimeout(r, GAP_MS));
      }
      await c.updateOne({ _id }, { $set: { sent, failed, blocked, status: "done", finishedAt: new Date() } });
    } catch (e) {
      console.error("broadcast", e);
      await c.updateOne({ _id }, { $set: { sent, failed, blocked, status: "error", finishedAt: new Date() } }).catch(() => {});
    }
  })();
  return String(_id);
}
