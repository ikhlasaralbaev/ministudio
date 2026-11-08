import { lintBot } from "@/lib/bot";
import { connectBot } from "@/lib/server/botconnect";
import { envOf, projects, publicUrl } from "@/lib/server/projects";
import { requireProject } from "@/lib/server/access";
import { actor, audit } from "@/lib/server/audit";
import { fail, handle, ok } from "@/lib/server/http";

export async function POST(req: Request, ctx: RouteContext<"/api/projects/[id]/publish">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { project: p, user, perms } = await requireProject(id, "update");
    if (p.suspended && !perms.isAdmin) return fail("Loyiha administrator tomonidan to'xtatilgan", 403);
    if (!p.doc) return fail("Avval ilovani yarating");

    const version = (p.publishedVersion || 0) + 1;
    const now = new Date();
    await (await projects()).updateOne(
      { _id: p._id },
      {
        $set: { publishedDoc: p.doc, publishedVersion: version, publishedAt: now },
        $push: { history: { $each: [{ version, doc: p.doc, at: now }], $slice: -20 } },
      },
    );

    await audit({ ...actor(user, perms.viaAdmin), action: "project.publish", projectId: id, details: { version } });

    const base = publicUrl(req);
    const appUrl = `${base}/app/${p.slug}`;
    const env = envOf(p);
    const { botUsername, warnings } = await connectBot({ p, doc: p.doc, env, base });
    warnings.push(...lintBot(p.doc.bot, p.doc.collections.filter((c) => c.mode === "records").map((c) => c.name)));
    if (!env.OWNER_CHAT_ID) warnings.push("Egasi (OWNER_CHAT_ID) ulanmagan — buyurtma xabarlari yuborilmaydi.");

    return ok({ version, url: appUrl, botUsername: botUsername || null, warnings });
  });
}
