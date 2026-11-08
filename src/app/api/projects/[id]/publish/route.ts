import { commandList, lintBot } from "@/lib/bot";
import { envOf, projects, publicUrl } from "@/lib/server/projects";
import { requireProject } from "@/lib/server/access";
import { actor, audit } from "@/lib/server/audit";
import { tgApi } from "@/lib/server/telegram";
import { botSecret } from "@/lib/server/runtime";
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
    const warnings: string[] = [];
    const env = envOf(p);
    let botUsername = p.botUsername;

    if (!env.BOT_TOKEN) {
      warnings.push(
        "Bot token kiritilmagan — ilova faqat havola orqali ochiladi, buyurtma/to'lov kabi server amallari esa ishlamaydi.",
      );
    } else if (!base.startsWith("https://")) {
      warnings.push(
        `Telegram faqat https manzilni qabul qiladi. PUBLIC_URL ni https ga sozlang (masalan, ngrok yoki serverdagi domen). Hozirgi: ${base}`,
      );
    } else {
      try {
        const me = await tgApi<{ username: string }>(env.BOT_TOKEN, "getMe");
        botUsername = me.username;
        await tgApi(env.BOT_TOKEN, "setWebhook", {
          url: `${base}/api/bot/${id}`,
          secret_token: botSecret(id),
          allowed_updates: ["message", "callback_query"],
          drop_pending_updates: false,
        });
        await tgApi(env.BOT_TOKEN, "setChatMenuButton", {
          menu_button: { type: "web_app", text: (p.doc.bot?.buttonText || "Ochish").slice(0, 32), web_app: { url: appUrl } },
        });
        await tgApi(env.BOT_TOKEN, "setMyCommands", {
          commands: commandList(p.doc.bot),
        });
        if (botUsername !== p.botUsername)
          await (await projects()).updateOne({ _id: p._id }, { $set: { botUsername } });
      } catch (e) {
        warnings.push((e as Error).message);
      }
    }
    warnings.push(...lintBot(p.doc.bot, p.doc.collections.filter((c) => c.mode === "records").map((c) => c.name)));
    if (!env.OWNER_CHAT_ID) warnings.push("Egasi (OWNER_CHAT_ID) ulanmagan — buyurtma xabarlari yuborilmaydi.");

    return ok({ version, url: appUrl, botUsername: botUsername || null, warnings });
  });
}
