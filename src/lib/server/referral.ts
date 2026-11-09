import "server-only";
import { randomBytes } from "crypto";
import { ObjectId } from "mongodb";
import { db } from "./db";
import { addCredits } from "./credits";
import { usersCol } from "./users";

/**
 * Referrals: every account has a short code; a link `/?ref=CODE` remembers it in a cookie, and the first time the new
 * account is seen signed in, the person who shared the link gets REFERRAL_CREDITS. One reward per invited account, never
 * for yourself, only for accounts created in the last few days, and at most MAX_REFERRALS rewards per person.
 */
export const REFERRAL_CREDITS = () => Math.max(0, Number(process.env.REFERRAL_CREDITS ?? 25));
const MAX_REFERRALS = () => Math.max(1, Number(process.env.MAX_REFERRALS ?? 100));
/** an account older than this can no longer be "invited" */
const NEW_FOR_MS = 3 * 24 * 3600_000;
export const REF_COOKIE = "ms_ref";
export const validRefCode = (c: unknown): c is string => typeof c === "string" && /^[a-z0-9]{6,12}$/.test(c);

interface CodeRow {
  _id: string;
  code: string;
}
interface RefRow {
  /** the invited account (unique: one reward per account) */
  _id: string;
  referrerId: string;
  credits: number;
  at: Date;
}
const codes = async () => (await db()).collection<CodeRow>("referral_codes");
const refs = async () => (await db()).collection<RefRow>("referrals");

/** The person's own code (made on first use). */
export async function ensureCode(userId: string): Promise<string> {
  const c = await codes();
  const have = await c.findOne({ _id: userId });
  if (have) return have.code;
  await c.createIndex({ code: 1 }, { unique: true });
  for (let i = 0; i < 6; i++) {
    const code = randomBytes(6).toString("hex").slice(0, 8);
    try {
      await c.insertOne({ _id: userId, code });
      return code;
    } catch {
      // the other writer won the same user (two tabs), or the code collided: read or retry
      const now = await c.findOne({ _id: userId });
      if (now) return now.code;
    }
  }
  throw new Error("referral code");
}

export type ClaimResult = { ok: true; credits: number } | { ok: false; reason: "invalid" | "self" | "old" | "done" | "limit" | "off" };

/** Called once a signed-in, new account carries a referral cookie. Idempotent: the same account is never rewarded twice. */
export async function claimReferral(userId: string, code: string): Promise<ClaimResult> {
  const reward = REFERRAL_CREDITS();
  if (!reward) return { ok: false, reason: "off" };
  if (!validRefCode(code)) return { ok: false, reason: "invalid" };
  const owner = await (await codes()).findOne({ code });
  if (!owner) return { ok: false, reason: "invalid" };
  if (owner._id === userId) return { ok: false, reason: "self" };
  if (!ObjectId.isValid(userId)) return { ok: false, reason: "invalid" };
  const u = await usersCol().findOne({ _id: new ObjectId(userId) });
  const created = u?.createdAt ? new Date(u.createdAt).getTime() : 0;
  if (!created || Date.now() - created > NEW_FOR_MS) return { ok: false, reason: "old" };
  const r = await refs();
  if ((await r.countDocuments({ referrerId: owner._id })) >= MAX_REFERRALS()) return { ok: false, reason: "limit" };
  try {
    // the unique _id is the lock: whoever inserts first pays out
    await r.insertOne({ _id: userId, referrerId: owner._id, credits: reward, at: new Date() });
  } catch {
    return { ok: false, reason: "done" };
  }
  await addCredits(owner._id, reward, "referral", undefined, userId);
  return { ok: true, credits: reward };
}

export async function referralStats(userId: string): Promise<{ code: string; invited: number; credits: number }> {
  const code = await ensureCode(userId);
  const rows = await (await refs()).find({ referrerId: userId }).toArray();
  return { code, invited: rows.length, credits: rows.reduce((s, x) => s + x.credits, 0) };
}
