import "server-only";
import { randomBytes } from "crypto";
import { ObjectId } from "mongodb";
import { db } from "./db";
import { usersCol } from "./users";
import { HttpError } from "./http";
export interface TgLoginUser {
  id: number;
  firstName: string;
  username: string;
}

type TgFields = { telegramId?: number; telegramUsername?: string; telegramName?: string; telegramLinkedAt?: Date };

let indexed: Promise<unknown> | null = null;
/** One Telegram account can be linked to one platform account only. */
function ensureIndex() {
  indexed ??= usersCol()
    .createIndex({ telegramId: 1 } as never, { unique: true, partialFilterExpression: { telegramId: { $type: "number" } } })
    .catch((e) => {
      indexed = null;
      console.error("telegramId index", e);
    });
  return indexed;
}

export async function getTelegramLink(userId: string): Promise<{ id: number; username: string; name: string } | null> {
  if (!ObjectId.isValid(userId)) return null;
  const u = (await usersCol().findOne({ _id: new ObjectId(userId) })) as (TgFields & { _id: ObjectId }) | null;
  return u?.telegramId ? { id: u.telegramId, username: u.telegramUsername || "", name: u.telegramName || "" } : null;
}

/** Accounts made from Telegram alone have no real email: this placeholder keeps the user record shape. */
export const TG_EMAIL_SUFFIX = "@telegram.invalid";
export const isTelegramOnly = (email: string | undefined | null) => !!email && email.endsWith(TG_EMAIL_SUFFIX);

/**
 * The platform account of a Telegram user, created on the spot when there is none (Telegram-first: pressing /start in
 * the manager bot is enough, no Google needed). Only call it for a Telegram identity that was just proven (a bot message
 * or verified Mini App data).
 */
export async function ensureTelegramUser(tg: { id: number; first_name?: string; username?: string }): Promise<{ id: string }> {
  await ensureIndex();
  const find = async () => {
    const u = (await usersCol().findOne({ telegramId: tg.id } as never)) as { _id: ObjectId } | null;
    return u ? { id: u._id.toHexString() } : null;
  };
  const existing = await find();
  if (existing) return existing;
  const now = new Date();
  try {
    const r = await usersCol().insertOne({
      email: `tg${tg.id}${TG_EMAIL_SUFFIX}`,
      name: tg.first_name || tg.username || `Telegram ${tg.id}`,
      emailVerified: true,
      banned: false,
      createdAt: now,
      updatedAt: now,
      telegramId: tg.id,
      telegramUsername: tg.username || "",
      telegramName: tg.first_name || "",
      telegramLinkedAt: now,
    } as never);
    return { id: r.insertedId.toHexString() };
  } catch (e) {
    // two first messages racing: the unique index lets one in, the other reads it
    const again = await find();
    if (again) return again;
    throw e;
  }
}

/**
 * A Telegram-only account joins the Google account that just proved the same Telegram: its projects, usage history and
 * pending claims move over, then the placeholder account and its sessions are deleted.
 */
export async function mergeTelegramAccount(targetUserId: string, fromUserId: string) {
  const d = await db();
  await d.collection("projects").updateMany({ ownerId: fromUserId }, { $set: { ownerId: targetUserId } });
  await d.collection("projects").updateMany({ "members.userId": fromUserId }, { $set: { "members.$[m].userId": targetUserId } }, { arrayFilters: [{ "m.userId": fromUserId }] });
  // The same person can now appear twice in a project (as the target and as the absorbed account), or as owner and
  // member: keep one entry each and never list the owner as a member.
  const col = d.collection("projects");
  for (const pr of await col.find({ "members.userId": targetUserId }).toArray()) {
    const seen = new Set<string>();
    const members = ((pr.members as { userId?: string | null }[]) || []).filter((m) => {
      if (m.userId !== targetUserId) return true;
      if (pr.ownerId === targetUserId || seen.has(targetUserId)) return false;
      seen.add(targetUserId);
      return true;
    });
    await col.updateOne({ _id: pr._id }, { $set: { members } });
  }
  for (const c of ["usage", "ai_jobs", "bot_claims", "audit"]) {
    await d.collection(c).updateMany({ userId: fromUserId }, { $set: { userId: targetUserId } });
  }
  await d.collection("session").deleteMany({ userId: fromUserId });
  await d.collection("account").deleteMany({ userId: fromUserId });
  if (ObjectId.isValid(fromUserId)) await usersCol().deleteOne({ _id: new ObjectId(fromUserId) });
}

export async function linkTelegram(userId: string, tg: TgLoginUser) {
  if (!ObjectId.isValid(userId)) throw new HttpError("Foydalanuvchi topilmadi", 404);
  await ensureIndex();
  const other = (await usersCol().findOne({ telegramId: tg.id } as never)) as { _id: ObjectId; email?: string } | null;
  if (other && other._id.toHexString() !== userId) {
    // a placeholder made from Telegram alone is absorbed; a real account elsewhere still refuses
    if (!isTelegramOnly(other.email)) throw new HttpError("Bu Telegram boshqa akkauntga ulangan", 409);
    await mergeTelegramAccount(userId, other._id.toHexString());
  }
  await usersCol().updateOne(
    { _id: new ObjectId(userId) },
    { $set: { telegramId: tg.id, telegramUsername: tg.username, telegramName: tg.firstName, telegramLinkedAt: new Date() } as never },
  );
}

export async function unlinkTelegram(userId: string) {
  if (!ObjectId.isValid(userId)) return;
  await usersCol().updateOne({ _id: new ObjectId(userId) }, { $unset: { telegramId: "", telegramUsername: "", telegramName: "", telegramLinkedAt: "" } as never });
}

/** Platform user (hex id) linked to a Telegram id, if any. */
export async function userByTelegramId(tgId: number): Promise<{ id: string; email: string } | null> {
  const u = (await usersCol().findOne({ telegramId: tgId } as never)) as { _id: ObjectId; email: string } | null;
  return u ? { id: u._id.toHexString(), email: u.email } : null;
}

/* ---------- linking through a deep link to the manager bot (no login widget, no domain setup) ---------- */

interface LinkCode {
  _id: string;
  userId: string;
  createdAt: Date;
}
const codes = async () => (await db()).collection<LinkCode>("tg_link_codes");
const CODE_TTL_MS = 15 * 60_000;

/** One-time code for "open the manager bot and press Start". Expires in 15 minutes. */
export async function createLinkCode(userId: string): Promise<string> {
  const c = await codes();
  await c.createIndex({ createdAt: 1 }, { expireAfterSeconds: 900 });
  const code = randomBytes(18).toString("hex");
  await c.insertOne({ _id: code, userId, createdAt: new Date() });
  return code;
}

/** Whose code it is (without using it), so the bot can show the account before asking for confirmation. */
export async function peekLinkCode(code: string): Promise<{ userId: string; email: string } | null> {
  if (!/^[a-f0-9]{36}$/.test(code)) return null;
  const row = await (await codes()).findOne({ _id: code, createdAt: { $gt: new Date(Date.now() - CODE_TTL_MS) } });
  if (!row || !ObjectId.isValid(row.userId)) return null;
  const u = (await usersCol().findOne({ _id: new ObjectId(row.userId) })) as { email?: string } | null;
  return u ? { userId: row.userId, email: u.email || "" } : null;
}

/** Uses the code (atomically, once). */
export async function consumeLinkCode(code: string): Promise<string | null> {
  if (!/^[a-f0-9]{36}$/.test(code)) return null;
  const row = await (await codes()).findOneAndDelete({ _id: code, createdAt: { $gt: new Date(Date.now() - CODE_TTL_MS) } });
  return row?.userId ?? null;
}
