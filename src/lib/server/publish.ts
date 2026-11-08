import "server-only";
import type { WithId } from "mongodb";
import { lintBot } from "../bot";
import type { Perms } from "../permissions";
import { actor, audit } from "./audit";
import { connectBot } from "./botconnect";
import { HttpError } from "./http";
import { envOf, projects, type ProjectRow } from "./projects";
import type { SessionUser } from "./access";

/** Makes the draft live: stores a version, connects the bot, returns warnings (shared by the web API and Telegram chat). */
export async function publishProject(o: { p: WithId<ProjectRow>; user: SessionUser; perms: Perms; base: string }) {
  const { p, user, perms, base } = o;
  if (p.suspended && !perms.isAdmin) throw new HttpError("Loyiha administrator tomonidan to'xtatilgan", 403);
  if (!p.doc) throw new HttpError("Avval ilovani yarating", 400);
  const id = p._id.toHexString();
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

  const env = envOf(p);
  const { botUsername, warnings } = await connectBot({ p, doc: p.doc, env, base });
  warnings.push(...lintBot(p.doc.bot, p.doc.collections.filter((c) => c.mode === "records").map((c) => c.name)));
  if (!env.OWNER_CHAT_ID) warnings.push("Egasi (OWNER_CHAT_ID) ulanmagan — buyurtma xabarlari yuborilmaydi.");
  return { version, url: `${base}/app/${p.slug}`, botUsername: botUsername || null, warnings };
}
