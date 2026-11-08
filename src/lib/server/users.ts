import "server-only";
import { ObjectId } from "mongodb";
import { rawDb } from "./db";
import { normalizeEmail } from "../permissions";

export interface UserLite {
  id: string;
  email: string;
  name: string;
  image?: string | null;
}

// Better Auth's MongoDB adapter stores users in "user" with an ObjectId _id; session user ids are its hex string.
type UserDoc = { _id: ObjectId; email: string; name: string; image?: string | null; banned?: boolean; createdAt?: Date };
export const usersCol = () => rawDb().collection<UserDoc>("user");

const lite = (u: UserDoc): UserLite => ({ id: u._id.toHexString(), email: normalizeEmail(u.email), name: u.name, image: u.image });

export async function userByEmail(email: string): Promise<UserLite | null> {
  const u = await usersCol().findOne({ email: normalizeEmail(email) });
  return u ? lite(u) : null;
}

export async function usersByIds(ids: string[]): Promise<Map<string, UserLite>> {
  const oids = ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const list = oids.length ? await usersCol().find({ _id: { $in: oids } }).toArray() : [];
  return new Map(list.map((u) => [u._id.toHexString(), lite(u)]));
}

/** A platform user as the permission checks see them (banned accounts are refused). */
export async function sessionUserById(userId: string): Promise<{ id: string; email: string; name: string; image?: string | null; isAdmin: boolean } | null> {
  if (!ObjectId.isValid(userId)) return null;
  const u = await usersCol().findOne({ _id: new ObjectId(userId) });
  if (!u || u.banned) return null;
  const { isPlatformAdmin } = await import("./access");
  return { id: u._id.toHexString(), email: normalizeEmail(u.email), name: u.name, image: u.image, isAdmin: isPlatformAdmin(u.email) };
}
