import { requireUser } from "@/lib/server/access";
import { getTelegramLink, linkTelegram, unlinkTelegram } from "@/lib/server/tglink";
import { managerConfig } from "@/lib/server/manager";
import { verifyLoginWidget } from "@/lib/tglogin";
import { fail, handle, ok } from "@/lib/server/http";

/** GET: is Telegram linked, and the manager bot the login widget belongs to. */
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    const m = managerConfig();
    return ok({ linked: await getTelegramLink(user.id), loginBot: m?.username ?? null, enabled: !!m });
  });
}

/** POST: the data the Telegram Login Widget returned. It is verified here; the browser's word is never trusted. */
export async function POST(req: Request) {
  return handle(async () => {
    const user = await requireUser();
    const m = managerConfig();
    if (!m) return fail("Telegram orqali ulash sozlanmagan", 503);
    const tg = verifyLoginWidget((await req.json()) ?? {}, m.token);
    if (!tg) return fail("Telegram ma'lumoti tasdiqlanmadi yoki eskirgan. Qayta urinib ko'ring.", 400);
    await linkTelegram(user.id, tg);
    return ok({ linked: { id: tg.id, username: tg.username, name: tg.firstName } });
  });
}

export async function DELETE() {
  return handle(async () => {
    const user = await requireUser();
    await unlinkTelegram(user.id);
    return ok({ ok: true });
  });
}
