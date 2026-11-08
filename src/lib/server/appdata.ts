import "server-only";
import { ObjectId, type Filter } from "mongodb";
import { db } from "./db";
import { toRow, type RecordRow } from "../records";
import type { TgUser } from "./telegram";
import type { AppDoc } from "../types";

/** What a mini app user stores: one document per record, owned by the Telegram user who wrote it. */
export interface RecordDoc {
  _id: ObjectId;
  projectId: string;
  collection: string;
  number: number;
  data: unknown;
  tgUser: (TgUser & Record<string, unknown>) | null;
  createdAt: Date;
  updatedAt?: Date;
}

/** People who opened a project's mini app (one row per Telegram user). */
export interface TgUserDoc {
  projectId: string;
  tgId: number;
  firstName: string;
  lastName: string;
  username: string;
  languageCode: string;
  isPremium: boolean;
  firstSeen: Date;
  lastSeen: Date;
  actions: number;
}

export const LIST_LIMIT = 500;

export const recordsCol = async () => (await db()).collection<RecordDoc>("records");
export const tgUsersCol = async () => (await db()).collection<TgUserDoc>("tg_users");

export function recordsCollection(doc: AppDoc, name: unknown) {
  return doc.collections.find((c) => c.name === name && c.mode === "records") || null;
}

/** Rows belong to their Telegram user; without a bot (local dev only) everyone shares the anonymous bucket. */
export function ownerFilter(projectId: string, user: TgUser | null): Filter<RecordDoc> {
  return user ? { projectId, "tgUser.id": user.id } : { projectId, tgUser: null };
}

export async function trackTgUser(projectId: string, user: TgUser | null) {
  if (!user) return;
  const u = user as TgUser & { language_code?: string; is_premium?: boolean };
  const now = new Date();
  await (await tgUsersCol()).updateOne(
    { projectId, tgId: u.id },
    {
      $set: {
        firstName: u.first_name || "",
        lastName: u.last_name || "",
        username: u.username || "",
        languageCode: u.language_code || "",
        isPremium: !!u.is_premium,
        lastSeen: now,
      },
      $setOnInsert: { firstSeen: now },
      $inc: { actions: 1 },
    },
    { upsert: true },
  );
}

/** The caller's own rows of every records collection, newest first. */
export async function listOwn(projectId: string, doc: AppDoc, user: TgUser | null): Promise<Record<string, RecordRow[]>> {
  const col = await recordsCol();
  const out: Record<string, RecordRow[]> = {};
  for (const c of doc.collections.filter((x) => x.mode === "records")) {
    const docs = await col
      .find({ ...ownerFilter(projectId, user), collection: c.name })
      .sort({ createdAt: -1 })
      .limit(LIST_LIMIT)
      .toArray();
    out[c.name] = docs.map(toRow);
  }
  return out;
}

const oid = (id: unknown) => (typeof id === "string" && ObjectId.isValid(id) ? new ObjectId(id) : null);

/** Merges `patch` into the data of a row the caller owns. Returns the updated row, or null if not theirs. */
export async function updateOwn(
  projectId: string,
  collection: string,
  user: TgUser | null,
  id: unknown,
  patch: Record<string, unknown>,
): Promise<RecordRow | null> {
  const _id = oid(id);
  if (!_id) return null;
  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(patch)) {
    if (!/^[A-Za-z][A-Za-z0-9_]{0,63}$/.test(k)) continue; // plain field names only (no "$", ".", "_id")
    set[`data.${k}`] = v;
  }
  const res = await (await recordsCol()).findOneAndUpdate(
    { ...ownerFilter(projectId, user), collection, _id, data: { $type: "object" } },
    { $set: set },
    { returnDocument: "after" },
  );
  return res ? toRow(res) : null;
}

export async function deleteOwn(projectId: string, collection: string, user: TgUser | null, id: unknown): Promise<boolean> {
  const _id = oid(id);
  if (!_id) return false;
  const r = await (await recordsCol()).deleteOne({ ...ownerFilter(projectId, user), collection, _id });
  return r.deletedCount === 1;
}
