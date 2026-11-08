import { createLogin } from "@/lib/server/tglogin";
import { managerConfig } from "@/lib/server/manager";
import { rateLimited } from "@/lib/server/runtime";
import { fail, handle, ok } from "@/lib/server/http";

/** POST: starts a browser login through Telegram. Returns the bot link to open and the secret this browser keeps. */
export async function POST(req: Request) {
  return handle(async () => {
    const m = managerConfig();
    if (!m) return fail("Telegram orqali kirish sozlanmagan", 503);
    const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "local";
    if (rateLimited(`tglogin:${ip}`, 10, 10 * 60_000)) return fail("Juda ko'p urinish. Birozdan keyin qayta urinib ko'ring.", 429);
    const { code, secret } = await createLogin(req.headers.get("user-agent") || "");
    return ok({ code, secret, link: `https://t.me/${m.username}?start=login_${code}` });
  });
}
