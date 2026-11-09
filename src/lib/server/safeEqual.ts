import { timingSafeEqual } from "crypto";

/** Constant-time string comparison for secrets, signatures and tokens (a missing value never matches). */
export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
