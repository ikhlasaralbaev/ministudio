// "Log in with Telegram" widget data: verifying that it really came from Telegram (HMAC with the bot token).
// https://core.telegram.org/widgets/login#checking-authorization
import { createHash, createHmac, timingSafeEqual } from "crypto";

export interface TgLoginUser {
  id: number;
  firstName: string;
  username: string;
}

/** Returns the Telegram user when `data` is genuine and fresh (default: signed within the last hour), else null. */
export function verifyLoginWidget(data: Record<string, unknown>, botToken: string, nowSec = Math.floor(Date.now() / 1000), maxAgeSec = 3600): TgLoginUser | null {
  const hash = typeof data.hash === "string" ? data.hash : "";
  if (!botToken || !/^[a-f0-9]{64}$/.test(hash)) return null;
  const check = Object.entries(data)
    .filter(([k, v]) => k !== "hash" && v !== undefined && v !== null)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");
  const secret = createHash("sha256").update(botToken).digest();
  const calc = createHmac("sha256", secret).update(check).digest();
  const given = Buffer.from(hash, "hex");
  if (calc.length !== given.length || !timingSafeEqual(calc, given)) return null;
  const at = Number(data.auth_date);
  const id = Number(data.id);
  if (!Number.isFinite(at) || nowSec - at > maxAgeSec || at - nowSec > 300) return null;
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  return { id, firstName: String(data.first_name ?? ""), username: String(data.username ?? "") };
}
