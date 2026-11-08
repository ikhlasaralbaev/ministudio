import { signInWithTelegram } from "@/lib/server/tgsignin";
import { rateLimited } from "@/lib/server/runtime";
import { fail, handle, ok } from "@/lib/server/http";

/** Mini App entry: exchanges Telegram's signed initData for a platform session. */
export async function POST(req: Request) {
  return handle(async () => {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
    if (rateLimited(`tgsignin:${ip}`, 20)) return fail("Juda ko'p urinish", 429);
    const body = await req.json().catch(() => ({}));
    await signInWithTelegram(String(body?.initData || ""));
    return ok({ ok: true });
  });
}
