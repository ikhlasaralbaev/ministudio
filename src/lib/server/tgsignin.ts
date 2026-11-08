import "server-only";
import { createHmac } from "crypto";
import { cookies } from "next/headers";
import { auth } from "./auth";
import { HttpError } from "./http";
import { managerConfig } from "./manager";
import { validateInitData } from "./telegram";
import { userByTelegramId } from "./tglink";
import { sessionUserById } from "./users";

/** initData older than this is refused (it is the user's proof of identity, so it must be fresh). */
const MAX_AGE_SEC = 300;

/**
 * Signs a user in from Telegram's signed Mini App data (initData of the manager bot's web app). The Telegram account
 * must already be linked to a platform account; this never creates accounts. Sets the normal Better Auth session cookie.
 */
export async function signInWithTelegram(initData: string): Promise<{ userId: string }> {
  const m = managerConfig();
  if (!m) throw new HttpError("Telegram orqali kirish sozlanmagan", 503);
  const tg = validateInitData(initData, m.token, MAX_AGE_SEC);
  if (!tg) throw new HttpError("Telegram ma'lumoti yaroqsiz yoki eskirgan. Mini App'ni qayta oching.", 401);
  const linked = await userByTelegramId(tg.id);
  if (!linked) throw new HttpError("Bu Telegram hech qanday akkauntga ulanmagan. Avval sayt orqali Google bilan kirib, Telegramni ulang.", 403, "telegram_not_linked");
  if (!(await sessionUserById(linked.id))) throw new HttpError("Akkaunt bloklangan", 403, "banned");

  // A real Better Auth session, exactly as a Google sign-in would make it.
  const ctx = await auth.$context;
  const session = await ctx.internalAdapter.createSession(linked.id);
  if (!session) throw new HttpError("Sessiya yaratib bo'lmadi", 500);
  const cookie = ctx.authCookies.sessionToken;
  const signature = createHmac("sha256", ctx.secret).update(session.token).digest("base64");
  const { sameSite, maxAge, expires: _expires, ...rest } = cookie.attributes;
  void _expires;
  (await cookies()).set(cookie.name, `${session.token}.${signature}`, {
    ...rest,
    sameSite: String(sameSite).toLowerCase() as "lax" | "strict" | "none",
    expires: session.expiresAt,
    ...(maxAge ? { maxAge } : {}),
  });
  return { userId: linked.id };
}
