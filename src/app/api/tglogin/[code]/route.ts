import { claimLogin } from "@/lib/server/tglogin";
import { startSession } from "@/lib/server/tgsignin";
import { getTelegramLink } from "@/lib/server/tglink";
import { sessionUserById } from "@/lib/server/users";
import { fail, handle, ok } from "@/lib/server/http";

/** POST { secret }: has the person confirmed in Telegram? When yes (once), this browser gets a normal session cookie. */
export async function POST(req: Request, ctx: RouteContext<"/api/tglogin/[code]">) {
  return handle(async () => {
    const { code } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const r = await claimLogin(code, String(body?.secret ?? ""));
    if (r === "gone") return fail("Kirish so'rovi eskirgan. Qayta urinib ko'ring.", 410);
    if (r === "pending") return ok({ status: "pending" });
    if (!(await sessionUserById(r.userId))) return fail("Akkaunt bloklangan", 403);
    await startSession(r.userId, (await getTelegramLink(r.userId))?.id);
    return ok({ status: "ok" });
  });
}
