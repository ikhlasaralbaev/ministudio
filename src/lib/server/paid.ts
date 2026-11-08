import "server-only";
import { tgApi } from "./telegram";

export async function notifyPaid(env: Record<string, string>, pay: { orderId: string; amount: number; provider: string; description?: string }) {
  if (!env.BOT_TOKEN || !env.OWNER_CHAT_ID) return;
  await tgApi(env.BOT_TOKEN, "sendMessage", {
    chat_id: env.OWNER_CHAT_ID,
    text: `💳 To'lov qabul qilindi (${pay.provider})\n#${pay.orderId} — ${pay.amount.toLocaleString("ru-RU")} so'm\n${pay.description || ""}`,
  }).catch(() => {});
}
