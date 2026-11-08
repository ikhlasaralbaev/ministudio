import { db } from "@/lib/server/db";
import { envOf, projects, publicUrl, SUSPENDED_TEXT } from "@/lib/server/projects";
import { escapeHtml, tgApi, validateInitData, type TgUser } from "@/lib/server/telegram";
import { clickLink, paymeLink } from "@/lib/server/payments";
import { nextNumber, rateLimited } from "@/lib/server/runtime";
import { canonicalize, catalogIndex, serverAmount } from "@/lib/server/verify";
import { fail, handle, ok } from "@/lib/server/http";
import { deleteOwn, listOwn, recordsCol, recordsCollection, trackTgUser, updateOwn } from "@/lib/server/appdata";
import { toRow } from "@/lib/records";
import { sendOwnerAlert } from "@/lib/server/botops";

/**
 * Server-side actions called by published mini apps:
 * dbList / dbInsert / dbUpdate / dbDelete (the caller's own records), notifyOwner, pay.
 */
export async function POST(req: Request, ctx: RouteContext<"/api/rt/[slug]/action">) {
  return handle(async () => {
    const { slug } = await ctx.params;
    const p = await (await projects()).findOne({ slug }, { projection: { history: 0, doc: 0 } });
    if (!p?.publishedDoc) return fail("Topilmadi", 404);
    if (p.suspended) return fail(SUSPENDED_TEXT, 423);
    const env = envOf(p);
    const projectId = p._id.toHexString();
    const body = await req.json();

    // Who is calling? Server actions always require valid Telegram initData in production.
    // Without a bot there is no way to authenticate callers, so only local development may skip it.
    let user: TgUser | null = null;
    if (env.BOT_TOKEN) {
      user = validateInitData(String(body.initData || ""), env.BOT_TOKEN);
      if (!user) return fail("Telegram orqali oching (initData yaroqsiz)", 401);
    } else if (process.env.NODE_ENV === "production" && process.env.ALLOW_ANONYMOUS_ACTIONS !== "1") {
      return fail("Bot ulanmagan: server amallari faqat Telegram orqali ishlaydi", 403);
    }
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
    if (rateLimited(`${slug}:${user?.id ?? ip}`)) return fail("Juda ko'p so'rov, birozdan keyin urinib ko'ring", 429);

    await trackTgUser(projectId, user);
    const d = await db();
    switch (body.type) {
      case "dbList":
        // called once when the app opens: the user's own rows of every records collection
        return ok({ records: await listOwn(projectId, p.publishedDoc, user) });
      case "dbInsert": {
        const col = recordsCollection(p.publishedDoc, body.collection);
        if (!col) return fail(`"${body.collection}" kolleksiyasi yo'q`);
        if (JSON.stringify(body.value ?? null).length > 20_000) return fail("Ma'lumot juda katta");
        // Catalog fields (price, name...) of referenced products are replaced with the published values.
        const data = canonicalize(body.value ?? null, catalogIndex(p.publishedDoc));
        const number = await nextNumber(projectId, col.name);
        const doc = { projectId, collection: col.name, number, data, tgUser: user, createdAt: new Date() };
        const { insertedId } = await (await recordsCol()).insertOne(doc as never);
        // Collections listed in bot.ownerAlerts reach the owner with Accept / Reject buttons.
        if (p.publishedDoc.bot.ownerAlerts?.some((a) => a.collection === col.name))
          await sendOwnerAlert(env, p.publishedDoc, { _id: insertedId as never, number, collection: col.name, data, tgUser: user }).catch((e) =>
            console.error("owner alert", e),
          );
        return ok({ id: String(number), row: toRow({ ...doc, _id: insertedId }) });
      }
      case "dbUpdate": {
        const col = recordsCollection(p.publishedDoc, body.collection);
        if (!col) return fail(`"${body.collection}" kolleksiyasi yo'q`);
        if (!body.value || typeof body.value !== "object" || Array.isArray(body.value)) return fail("Yangilash uchun obyekt kerak");
        if (JSON.stringify(body.value).length > 20_000) return fail("Ma'lumot juda katta");
        const patch = canonicalize(body.value, catalogIndex(p.publishedDoc)) as Record<string, unknown>;
        const row = await updateOwn(projectId, col.name, user, body.id, patch);
        if (!row) return fail("Yozuv topilmadi", 404);
        return ok({ row });
      }
      case "dbDelete": {
        const col = recordsCollection(p.publishedDoc, body.collection);
        if (!col) return fail(`"${body.collection}" kolleksiyasi yo'q`);
        if (!(await deleteOwn(projectId, col.name, user, body.id))) return fail("Yozuv topilmadi", 404);
        return ok({ ok: true });
      }
      case "notifyOwner": {
        if (!env.BOT_TOKEN || !env.OWNER_CHAT_ID) return ok({ skipped: true });
        // The text comes from the app's visitors: keep it from becoming a spam channel to the owner.
        if (rateLimited(`notify:${slug}:${user?.id ?? ip}`, 5)) return fail("Juda ko'p xabar, birozdan keyin urinib ko'ring", 429);
        const text = String(body.text || "").slice(0, 3500);
        const from = user ? `\n\n👤 ${escapeHtml(user.first_name)}${user.username ? " @" + escapeHtml(user.username) : ""}` : "";
        await tgApi(env.BOT_TOKEN, "sendMessage", {
          chat_id: env.OWNER_CHAT_ID,
          text: escapeHtml(text) + from,
          parse_mode: "HTML",
        });
        return ok({ ok: true });
      }
      case "pay": {
        const provider = body.provider === "payme" ? "payme" : "click";
        // Never trust the client's amount: recompute it from the published pay expression.
        const amount = serverAmount(p.publishedDoc, {
          amountExpr: body.amountExpr,
          provider,
          state: body.state,
          extra: body.extra,
          user: user
            ? { id: user.id, firstName: user.first_name, lastName: user.last_name || "", username: user.username || "" }
            : { id: 0, firstName: "Mehmon", lastName: "", username: "" },
        });
        if (amount < 1000) return fail("To'lov summasi juda kichik");
        const orderId = String(await nextNumber(projectId, "payment"));
        const returnUrl = (p.botUsername ? `https://t.me/${p.botUsername}` : `${publicUrl(req)}/app/${slug}`);
        let url: string;
        if (provider === "click") {
          if (!env.CLICK_SERVICE_ID || !env.CLICK_MERCHANT_ID) return fail("Click sozlanmagan");
          url = clickLink({ serviceId: env.CLICK_SERVICE_ID, merchantId: env.CLICK_MERCHANT_ID, amount, orderId, returnUrl });
        } else {
          if (!env.PAYME_MERCHANT_ID) return fail("Payme sozlanmagan");
          url = paymeLink({ merchantId: env.PAYME_MERCHANT_ID, amount, orderId, returnUrl });
        }
        await d.collection("payments").insertOne({
          projectId,
          orderId,
          provider,
          amount,
          description: String(body.description || "").slice(0, 200),
          status: "pending",
          tgUser: user,
          createdAt: new Date(),
        });
        return ok({ url, orderId, amount });
      }
    }
    return fail("Noma'lum amal");
  });
}
