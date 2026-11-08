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

export async function linkTelegram(userId: string, tg: TgLoginUser) {
  if (!ObjectId.isValid(userId)) throw new HttpError("Foydalanuvchi topilmadi", 404);
  await ensureIndex();
  const other = (await usersCol().findOne({ telegramId: tg.id } as never)) as { _id: ObjectId } | null;
  if (other && other._id.toHexString() !== userId) throw new HttpError("Bu Telegram boshqa akkauntga ulangan", 409);
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
