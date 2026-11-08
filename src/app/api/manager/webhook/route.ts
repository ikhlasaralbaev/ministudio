import { handleManagedBot, managerConfig, managerSecret, type ManagedBotUpdate } from "@/lib/server/manager";
import { tgApi } from "@/lib/server/telegram";

// Webhook of the platform's manager bot. Always answers 200 so Telegram does not retry.
export async function POST(req: Request) {
  const m = managerConfig();
  if (!m || req.headers.get("x-telegram-bot-api-secret-token") !== managerSecret()) return new Response("forbidden", { status: 403 });
  try {
    const update = await req.json();
    // ManagedBotUpdated: { user: creator, bot: the managed bot }
    const mb: ManagedBotUpdate | undefined = update.managed_bot ?? update.managed_bot_updated;
    if (mb) console.log("manager:", await handleManagedBot(mb));
    else if (update.message?.chat?.id)
      await tgApi(m.token, "sendMessage", {
        chat_id: update.message.chat.id,
        text: "Bu MiniStudio platformasining yordamchi boti. Bot yaratish uchun platformadagi «Bot yaratish» tugmasidan foydalaning.",
      }).catch(() => {});
  } catch (e) {
    console.error("manager webhook", e);
  }
  return new Response("ok");
}
