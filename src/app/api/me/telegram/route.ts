import { requireUser } from "@/lib/server/access";
import { createLinkCode, getTelegramLink, unlinkTelegram } from "@/lib/server/tglink";
import { managerConfig } from "@/lib/server/manager";
import { fail, handle, ok } from "@/lib/server/http";

/** GET: is Telegram linked to this account. */
export async function GET() {
  return handle(async () => {
    const user = await requireUser();
    return ok({ linked: await getTelegramLink(user.id), enabled: !!managerConfig() });
  });
}

/** POST: a one-time link to the manager bot; pressing Start there and confirming links that Telegram account. */
export async function POST() {
  return handle(async () => {
    const user = await requireUser();
    const m = managerConfig();
    if (!m) return fail("Telegram orqali ulash sozlanmagan", 503);
    return ok({ link: `https://t.me/${m.username}?start=link_${await createLinkCode(user.id)}` });
  });
}

export async function DELETE() {
  return handle(async () => {
    const user = await requireUser();
    await unlinkTelegram(user.id);
    return ok({ ok: true });
  });
}
