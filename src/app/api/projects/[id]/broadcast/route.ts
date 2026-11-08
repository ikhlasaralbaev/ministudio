import { envOf } from "@/lib/server/projects";
import { requireProject } from "@/lib/server/access";
import { audienceSize, listBroadcasts, startBroadcast, MAX_PER_DAY } from "@/lib/server/broadcast";
import { actor, audit } from "@/lib/server/audit";
import { fail, handle, ok } from "@/lib/server/http";

/** GET: audience size and the latest broadcasts (progress). POST: send a message to everyone who used the bot. */
export async function GET(_req: Request, ctx: RouteContext<"/api/projects/[id]/broadcast">) {
  return handle(async () => {
    const { id } = await ctx.params;
    await requireProject(id, "read");
    const list = await listBroadcasts(id);
    return ok({
      audience: await audienceSize(id),
      maxPerDay: MAX_PER_DAY,
      items: list.map((b) => ({ id: String(b._id), text: b.text, status: b.status, total: b.total, sent: b.sent, failed: b.failed, blocked: b.blocked, createdAt: b.createdAt, by: b.by })),
    });
  });
}

export async function POST(req: Request, ctx: RouteContext<"/api/projects/[id]/broadcast">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { project: p, user, perms } = await requireProject(id, "update");
    if (p.suspended) return fail("Loyiha to'xtatilgan", 423);
    const token = envOf(p).BOT_TOKEN;
    if (!token) return fail("Avval bot tokenini kiriting");
    const body = await req.json();
    const text = String(body.text || "").trim();
    if (!text || text.length > 3500) return fail("Matn 1-3500 belgi bo'lishi kerak");
    let button: { text: string; url: string } | undefined;
    if (body.buttonUrl || body.buttonText) {
      const url = String(body.buttonUrl || "").trim();
      const label = String(body.buttonText || "").trim();
      if (!/^https:\/\/[^\s]+$/.test(url) || !label || label.length > 64) return fail("Tugma: https havola va matn (64 belgigacha) kerak");
      button = { text: label, url };
    }
    const bid = await startBroadcast({ projectId: id, token, text, button, by: user.email });
    if (perms.viaAdmin) await audit({ ...actor(user, true), action: "broadcast", projectId: id });
    return ok({ id: bid }, 202);
  });
}
