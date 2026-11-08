import "server-only";
import { createHmac } from "crypto";
import { db } from "./db";

function secret() {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 16) throw new Error("APP_SECRET (min 16 belgi) o'rnatilmagan");
  return s;
}

export function botSecret(projectId: string) {
  return createHmac("sha256", secret()).update("bot:" + projectId).digest("hex").slice(0, 48);
}
export function ownerCode(projectId: string) {
  return createHmac("sha256", secret()).update("owner:" + projectId).digest("hex").slice(0, 16);
}

/** Per-project incrementing number for readable order ids (#1001, #1002...). */
export async function nextNumber(projectId: string, name = "order"): Promise<number> {
  const r = await (await db())
    .collection<{ _id: string; n: number }>("counters")
    .findOneAndUpdate({ _id: `${projectId}:${name}` }, { $inc: { n: 1 } }, { upsert: true, returnDocument: "after" });
  return 1000 + (r?.n || 1);
}

const hits = new Map<string, { n: number; t: number }>();
/** Naive in-memory rate limit (per process). */
export function rateLimited(key: string, max = 30, windowMs = 60_000) {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now - h.t > windowMs) {
    hits.set(key, { n: 1, t: now });
    if (hits.size > 10_000) hits.clear();
    return false;
  }
  h.n++;
  return h.n > max;
}
