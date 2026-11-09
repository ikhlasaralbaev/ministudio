import { safeEqual } from "@/lib/server/safeEqual";
import { handleManagerUpdate, managerConfig, managerSecret } from "@/lib/server/manager";

// Webhook of the platform's manager bot. Always answers 200 so Telegram does not retry.
export async function POST(req: Request) {
  if (!managerConfig() || !safeEqual(req.headers.get("x-telegram-bot-api-secret-token"), managerSecret())) return new Response("forbidden", { status: 403 });
  try {
    console.log("manager:", await handleManagerUpdate(await req.json()));
  } catch (e) {
    console.error("manager webhook", e);
  }
  return new Response("ok");
}
