import { requireProject } from "@/lib/server/access";
import { actor, audit } from "@/lib/server/audit";
import { connectBot } from "@/lib/server/botconnect";
import { encryptEnv } from "@/lib/server/crypto";
import { envOf, projects, publicUrl } from "@/lib/server/projects";
import { tgApi } from "@/lib/server/telegram";
import { fail, handle, ok } from "@/lib/server/http";

const TOKEN = /^\d{6,}:[A-Za-z0-9_-]{30,}$/;

/**
 * POST { token }: connect a bot the person already made in BotFather. The token is checked with Telegram (getMe) and,
 * when the app is live, the webhook is pointed here too. Nothing is saved unless all of that works.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/projects/[id]/bot/token">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { project: p, user, perms } = await requireProject(id, "update");
    if (p.suspended) return fail("Loyiha to'xtatilgan", 423);
    const body = await req.json().catch(() => ({}));
    const token = String(body?.token ?? "").trim();
    if (!TOKEN.test(token)) return fail("Token noto'g'ri ko'rinadi. BotFather bergan to'liq tokenni kiriting (123456:ABC…).");
    if (envOf(p).BOT_TOKEN) return fail("Bu loyihada bot allaqachon ulangan", 409);

    let username: string;
    try {
      username = (await tgApi<{ username: string }>(token, "getMe")).username;
    } catch {
      return fail("Telegram bu tokenni qabul qilmadi. Tokenni tekshiring yoki BotFather'da yangisini oling.");
    }

    const env = { ...envOf(p), BOT_TOKEN: token };
    if (p.publishedDoc) {
      const r = await connectBot({ p: { ...p, botUsername: username }, doc: p.publishedDoc, env, base: publicUrl() });
      if (r.warnings.length) return fail("Botni ulab bo'lmadi: " + r.warnings[0]);
    }
    await (await projects()).updateOne({ _id: p._id }, { $set: { envEnc: encryptEnv(env), botUsername: username, updatedAt: new Date() } });
    await audit({ ...actor(user, perms.viaAdmin), action: "env.update", projectId: id, details: { keys: ["BOT_TOKEN"] } });
    return ok({ botUsername: username });
  });
}
