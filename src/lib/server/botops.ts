import "server-only";
import { ObjectId } from "mongodb";
import { db } from "./db";
import { recordsCol } from "./appdata";
import { escapeHtml, tgApi, type TgUser } from "./telegram";
import { nextNumber } from "./runtime";
import type { FlowState } from "../bot";
import type { AppDoc } from "../types";

/* ---------- conversation state (which question a chat is on) ---------- */

const stateCol = async () => (await db()).collection<{ projectId: string; chatId: number; state: FlowState; updatedAt: Date }>("bot_state");

export async function getFlowState(projectId: string, chatId: number): Promise<FlowState | null> {
  return (await (await stateCol()).findOne({ projectId, chatId }))?.state ?? null;
}

export async function setFlowState(projectId: string, chatId: number, state: FlowState | null) {
  const c = await stateCol();
  if (!state) await c.deleteOne({ projectId, chatId });
  else await c.updateOne({ projectId, chatId }, { $set: { state, updatedAt: new Date() } }, { upsert: true });
}

/* ---------- owner alerts with Accept / Reject ---------- */

/** "key: value" lines of a record, HTML-escaped and trimmed so a long answer cannot flood the owner. */
export function summarize(data: unknown): string {
  if (!data || typeof data !== "object" || Array.isArray(data)) return escapeHtml(String(data ?? "")).slice(0, 500);
  return Object.entries(data as Record<string, unknown>)
    .slice(0, 15)
    .map(([k, v]) => {
      const val = typeof v === "object" ? JSON.stringify(v) : String(v ?? "");
      return `<b>${escapeHtml(k)}:</b> ${escapeHtml(val.slice(0, 200))}`;
    })
    .join("\n");
}

const who = (u: TgUser | null) => (u ? `\n\n👤 ${escapeHtml(u.first_name || "")}${u.username ? " @" + escapeHtml(u.username) : ""}` : "");

/** Sends a new record to the owner. With an ownerAlerts entry for the collection it carries Accept / Reject buttons. */
export async function sendOwnerAlert(
  env: Record<string, string>,
  doc: AppDoc,
  rec: { _id: ObjectId | null; number?: number; collection: string; data: unknown; tgUser: TgUser | null },
) {
  if (!env.BOT_TOKEN || !env.OWNER_CHAT_ID) return;
  const alert = (doc.bot.ownerAlerts || []).find((a) => a.collection === rec.collection);
  const title = `🔔 <b>Yangi ${escapeHtml(rec.collection)}${rec.number ? " #" + rec.number : ""}</b>`;
  await tgApi(env.BOT_TOKEN, "sendMessage", {
    chat_id: env.OWNER_CHAT_ID,
    text: `${title}\n${summarize(rec.data)}${who(rec.tgUser)}`,
    parse_mode: "HTML",
    ...(alert && rec._id && rec.tgUser
      ? {
          reply_markup: {
            inline_keyboard: [[
              { text: "✅ Qabul qilish", callback_data: `o:${rec._id.toHexString()}:a` },
              { text: "❌ Rad etish", callback_data: `o:${rec._id.toHexString()}:r` },
            ]],
          },
        }
      : {}),
  });
}

/** Owner pressed Accept / Reject: store the status once, tell the customer, close the buttons. */
export async function decideRecord(
  projectId: string,
  env: Record<string, string>,
  doc: AppDoc,
  recordId: string,
  decision: "a" | "r",
): Promise<string> {
  if (!ObjectId.isValid(recordId)) return "Topilmadi";
  const _id = new ObjectId(recordId);
  const col = await recordsCol();
  const status = decision === "a" ? "accepted" : "rejected";
  // Only the first decision counts (a second tap or a second owner device changes nothing).
  const rec = await col.findOneAndUpdate(
    { _id, projectId, "data.status": { $exists: false }, data: { $type: "object" } },
    { $set: { "data.status": status, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  if (!rec) return "Allaqachon hal qilingan yoki topilmadi";
  const alert = (doc.bot.ownerAlerts || []).find((a) => a.collection === rec.collection);
  const text =
    (decision === "a" ? alert?.acceptText : alert?.rejectText) ||
    (decision === "a" ? `✅ #${rec.number} qabul qilindi.` : `❌ #${rec.number} rad etildi.`);
  if (rec.tgUser?.id && env.BOT_TOKEN) await tgApi(env.BOT_TOKEN, "sendMessage", { chat_id: rec.tgUser.id, text }).catch(() => {});
  return decision === "a" ? "✅ Qabul qilindi" : "❌ Rad etildi";
}

/** A finished bot flow: store the answers as a record (if it has a collection) and tell the owner. */
export async function finishFlow(
  projectId: string,
  env: Record<string, string>,
  doc: AppDoc,
  save: { flowId: string; collection: string | null; data: Record<string, string | number>; notifyOwner: boolean },
  user: TgUser | null,
) {
  let _id: ObjectId | null = null;
  let number: number | undefined;
  const data = { ...save.data, source: "bot" };
  if (save.collection && doc.collections.some((c) => c.name === save.collection && c.mode === "records")) {
    number = await nextNumber(projectId, save.collection);
    const r = await (await recordsCol()).insertOne({ projectId, collection: save.collection, number, data, tgUser: user, createdAt: new Date() } as never);
    _id = r.insertedId as unknown as ObjectId;
  }
  if (save.notifyOwner) {
    await sendOwnerAlert(env, doc, { _id, number, collection: save.collection || save.flowId, data, tgUser: user }).catch((e) =>
      console.error("owner alert", e),
    );
  }
}
