import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

export async function tgApi<T = any>(token: string, method: string, body?: unknown): Promise<T> {
  const r = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
    cache: "no-store",
  });
  const j = await r.json().catch(() => ({ ok: false, description: `HTTP ${r.status}` }));
  if (!j.ok) throw new Error(`Telegram ${method}: ${j.description || "xato"}`);
  return j.result as T;
}

export interface TgUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
}

/**
 * Validates Telegram WebApp initData (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app)
 * Returns the user if valid and not older than maxAgeSec.
 */
export function validateInitData(initData: string, botToken: string, maxAgeSec = 86400): TgUser | null {
  if (!initData || !botToken) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const dataCheck = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
  const secret = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calc = createHmac("sha256", secret).update(dataCheck).digest("hex");
  const a = Buffer.from(calc, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const authDate = Number(params.get("auth_date") || 0);
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSec) return null;
  try {
    return JSON.parse(params.get("user") || "null");
  } catch {
    return null;
  }
}

export function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
