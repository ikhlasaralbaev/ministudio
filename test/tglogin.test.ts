import { createHash, createHmac } from "crypto";
import { describe, expect, it } from "vitest";
import { verifyLoginWidget } from "@/lib/tglogin";

const TOKEN = "123456:TEST-bot-token";
const NOW = 1_800_000_000;
function sign(data: Record<string, string | number>, token = TOKEN) {
  const check = Object.entries(data).map(([k, v]) => `${k}=${v}`).sort().join("\n");
  const hash = createHmac("sha256", createHash("sha256").update(token).digest()).update(check).digest("hex");
  return { ...data, hash };
}
const base = { id: 4242, first_name: "Ali", username: "ali_u", auth_date: NOW - 60 };

describe("verifyLoginWidget", () => {
  it("accepts data signed with the bot token", () =>
    expect(verifyLoginWidget(sign(base), TOKEN, NOW)).toEqual({ id: 4242, firstName: "Ali", username: "ali_u" }));
  it("rejects a different bot's signature", () => expect(verifyLoginWidget(sign(base, "999:other"), TOKEN, NOW)).toBeNull());
  it("rejects tampered fields (someone else's id)", () => expect(verifyLoginWidget({ ...sign(base), id: 1 }, TOKEN, NOW)).toBeNull());
  it("rejects stale and future auth_date", () => {
    expect(verifyLoginWidget(sign({ ...base, auth_date: NOW - 7200 }), TOKEN, NOW)).toBeNull();
    expect(verifyLoginWidget(sign({ ...base, auth_date: NOW + 3600 }), TOKEN, NOW)).toBeNull();
  });
  it("rejects a missing or malformed hash and an empty token", () => {
    expect(verifyLoginWidget(base, TOKEN, NOW)).toBeNull();
    expect(verifyLoginWidget({ ...base, hash: "zz" }, TOKEN, NOW)).toBeNull();
    expect(verifyLoginWidget(sign(base), "", NOW)).toBeNull();
  });
  it("optional fields may be missing", () =>
    expect(verifyLoginWidget(sign({ id: 7, auth_date: NOW }), TOKEN, NOW)).toEqual({ id: 7, firstName: "", username: "" }));
});
