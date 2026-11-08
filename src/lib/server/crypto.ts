import "server-only";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

function key() {
  const secret = process.env.APP_SECRET;
  if (!secret || secret.length < 16) throw new Error("APP_SECRET (min 16 belgi) .env.local da o'rnatilmagan");
  return createHash("sha256").update(secret).digest();
}

/** AES-256-GCM. Output: base64(iv | tag | ciphertext) */
export function encrypt(plain: string): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), enc]).toString("base64");
}

export function decrypt(blob: string): string {
  const buf = Buffer.from(blob, "base64");
  const d = createDecipheriv("aes-256-gcm", key(), buf.subarray(0, 12));
  d.setAuthTag(buf.subarray(12, 28));
  return Buffer.concat([d.update(buf.subarray(28)), d.final()]).toString("utf8");
}

export function encryptEnv(env: Record<string, string>): string {
  return encrypt(JSON.stringify(env));
}
export function decryptEnv(blob?: string | null): Record<string, string> {
  if (!blob) return {};
  try {
    return JSON.parse(decrypt(blob));
  } catch {
    return {};
  }
}
