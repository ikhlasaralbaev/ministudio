import "server-only";
import { createHash, randomBytes } from "crypto";
import { db } from "./db";

/**
 * "Sign in with Telegram" for a browser: the page asks for a login, shows a link that opens the manager bot, the person
 * presses Start and confirms there, and the page (which holds a secret nobody else has) is then signed in.
 * Two secrets on purpose: the `code` travels through Telegram (anyone with the link could open it), the `secret` never
 * leaves the browser that asked, so a forwarded link cannot sign someone else's browser in.
 */
interface Row {
  _id: string; // the code
  secretHash: string;
  ua: string;
  status: "pending" | "approved";
  userId?: string;
  createdAt: Date;
}
const col = async () => (await db()).collection<Row>("tg_logins");
const TTL_MS = 5 * 60_000;
const hash = (s: string) => createHash("sha256").update(s).digest("hex");

export async function createLogin(ua: string): Promise<{ code: string; secret: string }> {
  const c = await col();
  await c.createIndex({ createdAt: 1 }, { expireAfterSeconds: 300 });
  const code = randomBytes(12).toString("hex");
  const secret = randomBytes(24).toString("hex");
  await c.insertOne({ _id: code, secretHash: hash(secret), ua: ua.slice(0, 300), status: "pending", createdAt: new Date() });
  return { code, secret };
}

/** A login still waiting for confirmation in Telegram (shown to the person so they know which browser it is). */
export async function peekLogin(code: string): Promise<{ browser: string } | null> {
  if (!/^[a-f0-9]{24}$/.test(code)) return null;
  const row = await (await col()).findOne({ _id: code, status: "pending", createdAt: { $gt: new Date(Date.now() - TTL_MS) } });
  return row ? { browser: browserName(row.ua) } : null;
}

/** The person confirmed in Telegram: this login now belongs to `userId`. */
export async function approveLogin(code: string, userId: string): Promise<boolean> {
  if (!/^[a-f0-9]{24}$/.test(code)) return false;
  const r = await (await col()).updateOne({ _id: code, status: "pending", createdAt: { $gt: new Date(Date.now() - TTL_MS) } }, { $set: { status: "approved", userId } });
  return r.modifiedCount === 1;
}

/** The browser asks: approved yet? Only the holder of the secret gets the user, and only once. */
export async function claimLogin(code: string, secret: string): Promise<"pending" | "gone" | { userId: string }> {
  if (!/^[a-f0-9]{24}$/.test(code) || !/^[a-f0-9]{48}$/.test(secret)) return "gone";
  const c = await col();
  const row = await c.findOne({ _id: code, secretHash: hash(secret), createdAt: { $gt: new Date(Date.now() - TTL_MS) } });
  if (!row) return "gone";
  if (row.status !== "approved" || !row.userId) return "pending";
  const taken = await c.findOneAndDelete({ _id: code, status: "approved", secretHash: hash(secret) });
  return taken?.userId ? { userId: taken.userId } : "gone";
}

/** "Chrome on macOS" from a user agent, for the confirmation message. */
export function browserName(ua: string): string {
  const b = /Edg\//.test(ua) ? "Edge" : /OPR\/|Opera/.test(ua) ? "Opera" : /Firefox\//.test(ua) ? "Firefox" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "";
  const os = /Windows/.test(ua) ? "Windows" : /Android/.test(ua) ? "Android" : /iPhone|iPad|iOS/.test(ua) ? "iOS" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "";
  return [b, os].filter(Boolean).join(" · ") || "?";
}
