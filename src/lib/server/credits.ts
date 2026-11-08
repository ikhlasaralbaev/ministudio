import "server-only";
import { db } from "./db";
import { HttpError } from "./http";
import { AI_MODELS, DEFAULT_AI_MODEL } from "../models";
import type { Usage } from "./usage";

/**
 * Credits: the balance a person spends on AI requests. 1 credit = $0.01 of model cost (a Sonnet app is ~5-10 credits, a
 * small Haiku edit ~1). Stored as integer "mk" (1 credit = 100 mk = $0.0001 steps) so sums never drift.
 * Every account starts with FREE_CREDITS (default 100) the first time its balance is read; platform admins are not metered.
 */
export const MK_PER_CREDIT = 100;
export const FREE_CREDITS = () => Math.max(0, Number(process.env.FREE_CREDITS ?? 100));
const MARKUP = () => Math.max(1, Number(process.env.CREDIT_MARKUP) || 1);

export interface LedgerRow {
  userId: string;
  /** mk, positive = added, negative = spent */
  delta: number;
  reason: "grant" | "ai" | "topup" | "admin";
  note?: string;
  ref?: string;
  balanceAfter: number;
  at: Date;
}

const balances = async () => (await db()).collection<{ _id: string; mk: number; createdAt: Date }>("credit_balances");
const ledgerCol = async () => (await db()).collection<LedgerRow>("credit_ledger");

/** What one request cost, in mk (always at least 1 mk for a real request; mock/demo requests are free). */
export function costMk(u: Pick<Usage, "inputTokens" | "outputTokens" | "model" | "mock">): number {
  if (u.mock) return 0;
  const price = (AI_MODELS.find((m) => m.id === u.model) ?? AI_MODELS.find((m) => m.id === DEFAULT_AI_MODEL)!).price;
  const usd = (u.inputTokens * price.in + u.outputTokens * price.out) / 1_000_000;
  return Math.max(1, Math.ceil(usd * 10_000 * MARKUP()));
}

const toCredits = (mk: number) => Math.round((mk / MK_PER_CREDIT) * 100) / 100;

async function ensure(userId: string): Promise<number> {
  const c = await balances();
  const row = await c.findOne({ _id: userId });
  if (row) return row.mk;
  const grant = FREE_CREDITS() * MK_PER_CREDIT;
  try {
    await c.insertOne({ _id: userId, mk: grant, createdAt: new Date() });
    if (grant) await (await ledgerCol()).insertOne({ userId, delta: grant, reason: "grant", note: "Boshlang'ich kreditlar", balanceAfter: grant, at: new Date() });
    return grant;
  } catch {
    // two first reads racing: the unique _id lets one in, the other reads it
    return (await c.findOne({ _id: userId }))?.mk ?? grant;
  }
}

/** Current balance in credits (creates the account's starting grant on first use). */
export async function getCredits(userId: string): Promise<number> {
  return toCredits(await ensure(userId));
}

/** Refuses a new AI request when there is nothing left to spend. */
export async function requireCredits(userId: string): Promise<void> {
  if ((await ensure(userId)) <= 0) throw new HttpError("Kreditlar tugadi. Davom etish uchun balansni to'ldiring.", 402, "no_credits");
}

async function apply(userId: string, delta: number, reason: LedgerRow["reason"], extra: { note?: string; ref?: string } = {}): Promise<number> {
  await ensure(userId);
  const r = await (await balances()).findOneAndUpdate({ _id: userId }, { $inc: { mk: delta } }, { returnDocument: "after" });
  const after = r?.mk ?? 0;
  await (await ledgerCol()).insertOne({ userId, delta, reason, ...extra, balanceAfter: after, at: new Date() });
  return after;
}

/** Charges what the request really used (called when it finishes, failed ones included: the tokens were spent). */
export async function chargeUsage(userId: string, usage: Usage, ref?: string): Promise<number> {
  const cost = costMk(usage);
  if (!cost) return 0;
  await apply(userId, -cost, "ai", { ref, note: `${usage.model}: ${usage.inputTokens}+${usage.outputTokens} token` });
  return cost;
}

/** Adds credits (admin grant now; a payment later). */
export async function addCredits(userId: string, credits: number, reason: "admin" | "topup", note?: string, ref?: string): Promise<number> {
  if (!Number.isFinite(credits) || credits === 0) throw new HttpError("Miqdor noto'g'ri", 400);
  return toCredits(await apply(userId, Math.round(credits * MK_PER_CREDIT), reason, { note, ref }));
}

export async function creditHistory(userId: string, limit = 30) {
  await ensure(userId);
  const rows = await (await ledgerCol()).find({ userId }).sort({ at: -1 }).limit(limit).toArray();
  return rows.map((r) => ({ credits: toCredits(r.delta), reason: r.reason, note: r.note ?? null, balance: toCredits(r.balanceAfter), at: r.at }));
}

/** Balances for a page of users without creating anything (null = never used the AI yet). */
export async function peekCredits(userIds: string[]): Promise<Map<string, number>> {
  if (!userIds.length) return new Map();
  const rows = await (await balances()).find({ _id: { $in: userIds } }).toArray();
  return new Map(rows.map((r) => [r._id, toCredits(r.mk)]));
}
