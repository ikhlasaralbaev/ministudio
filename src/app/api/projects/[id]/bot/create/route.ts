import { requireProject } from "@/lib/server/access";
import { envOf } from "@/lib/server/projects";
import { createClaim, latestClaim, managerConfig, newBotLink } from "@/lib/server/manager";
import { getTelegramLink } from "@/lib/server/tglink";
import { fail, handle, ok } from "@/lib/server/http";

/** GET: state of the latest "create a bot" attempt (the page polls it while the user confirms in Telegram). */
export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[id]/bot/create">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { project: p } = await requireProject(id, "read");
    const c = await latestClaim(id);
    return ok({
      enabled: !!managerConfig(),
      hasBot: !!envOf(p).BOT_TOKEN,
      botUsername: p.botUsername ?? null,
      claim: c ? { status: c.status, createdAt: c.createdAt, botUsername: c.botUsername ?? null } : null,
    });
  });
}

/** POST: starts creating a bot for this project; returns the Telegram link the user opens to confirm. */
export async function POST(_req: Request, ctx: RouteContext<"/api/projects/[id]/bot/create">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { project: p, user } = await requireProject(id, "update");
    const m = managerConfig();
    if (!m) return fail("Avtomatik bot yaratish sozlanmagan", 503);
    if (p.suspended) return fail("Loyiha to'xtatilgan", 423);
    const tg = await getTelegramLink(user.id);
    if (!tg) return fail("Avval Telegramni ulang", 409, "telegram_not_linked");
    if (envOf(p).BOT_TOKEN) return fail("Bu loyihada bot allaqachon ulangan", 409);
    const { suggested } = await createClaim({ projectId: id, userId: user.id, tgId: tg.id, slug: p.slug, name: p.name });
    return ok({ link: newBotLink(m.username, suggested, p.name), suggested });
  });
}
