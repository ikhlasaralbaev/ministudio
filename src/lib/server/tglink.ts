import "server-only";
import { ObjectId } from "mongodb";
import { usersCol } from "./users";
import { HttpError } from "./http";
import type { TgLoginUser } from "../tglogin";

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
