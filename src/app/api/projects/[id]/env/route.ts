import { encryptEnv } from "@/lib/server/crypto";
import { envOf, projects, publicUrl } from "@/lib/server/projects";
import { requireProject } from "@/lib/server/access";
import { actor, audit } from "@/lib/server/audit";
import { tgApi } from "@/lib/server/telegram";
import { ownerCode } from "@/lib/server/runtime";
import { fail, handle, ok } from "@/lib/server/http";

const MASK = "••••••";
const mask = (v: string) => (v.length <= 8 ? MASK : v.slice(0, 4) + MASK + v.slice(-3));

export async function GET(req: Request, ctx: RouteContext<"/api/projects/[id]/env">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { project: p, perms } = await requireProject(id, "read");
    const env = envOf(p);
    // Non-secret ids are shown in full, secrets masked.
    const plain = new Set(["OWNER_CHAT_ID", "CLICK_SERVICE_ID", "CLICK_MERCHANT_ID", "PAYME_MERCHANT_ID"]);
    return ok({
      env: Object.fromEntries(Object.entries(env).map(([k, v]) => [k, plain.has(k) ? v : mask(v)])),
      botUsername: p.botUsername || null,
      // The owner link re-binds OWNER_CHAT_ID, so only editors get it.
      ownerLink: perms.update && p.botUsername ? `https://t.me/${p.botUsername}?start=owner_${ownerCode(id)}` : null,
      callbacks: {
        click: `${publicUrl(req)}/api/pay/click/${id}`,
        payme: `${publicUrl(req)}/api/pay/payme/${id}`,
        webhook: `${publicUrl(req)}/api/bot/${id}`,
      },
      published: !!p.publishedVersion,
    });
  });
}

/** Body: { env: { KEY: value } }. Empty string deletes a key; masked values are kept unchanged. */
export async function PUT(req: Request, ctx: RouteContext<"/api/projects/[id]/env">) {
  return handle(async () => {
    const { id } = await ctx.params;
    const { project: p, user, perms } = await requireProject(id, "update");
    const body = await req.json();
    const incoming = (body?.env || {}) as Record<string, string>;
    const env = envOf(p);
    const changed: string[] = [];
    for (const [k, raw] of Object.entries(incoming)) {
      if (!/^[A-Z][A-Z0-9_]{1,40}$/.test(k)) return fail(`Noto'g'ri kalit nomi: ${k}`);
      const v = String(raw ?? "").trim();
      if (v.includes(MASK)) continue;
      if ((env[k] || "") === v) continue;
      changed.push(k);
      if (!v) delete env[k];
      else env[k] = v;
    }
    let botUsername = p.botUsername;
    if (incoming.BOT_TOKEN !== undefined && !String(incoming.BOT_TOKEN).includes(MASK)) {
      if (env.BOT_TOKEN) {
        try {
          const me = await tgApi<{ username: string }>(env.BOT_TOKEN, "getMe");
          botUsername = me.username;
        } catch (e) {
          return fail("Bot token ishlamadi: " + (e as Error).message);
        }
      } else botUsername = undefined;
    }
    await (await projects()).updateOne(
      { _id: p._id },
      { $set: { envEnc: encryptEnv(env), botUsername, updatedAt: new Date() } },
    );
    if (changed.length)
      await audit({ ...actor(user, perms.viaAdmin), action: "env.update", projectId: id, details: { keys: changed } });
    return ok({ ok: true, botUsername: botUsername || null });
  });
}
