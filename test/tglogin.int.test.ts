// Integration test (real MongoDB, runs only when MONGODB_TEST_URI is set). Telegram is mocked.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const uri = process.env.MONGODB_TEST_URI;
const calls: { method: string; body: Record<string, unknown> }[] = [];
vi.mock("@/lib/server/telegram", async (orig) => ({
  ...(await orig<typeof import("@/lib/server/telegram")>()),
  tgApi: async (_t: string, method: string, body?: Record<string, unknown>) => {
    calls.push({ method, body: body ?? {} });
    return {};
  },
}));

describe.skipIf(!uri)("browser login through Telegram (MongoDB)", () => {
  beforeAll(() => {
    process.env.MONGODB_URI = uri;
    process.env.MONGODB_DB = "ministudio_tglogin_test";
    process.env.APP_SECRET = "test-secret-test-secret-1234";
    process.env.TELEGRAM_MANAGER_BOT_TOKEN = "1:MANAGER";
    process.env.TELEGRAM_MANAGER_BOT_USERNAME = "ms_manager_bot";
  });
  afterAll(async () => {
    const { rawDb } = await import("@/lib/server/db");
    await rawDb().dropDatabase();
  });

  const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";
  const start = async (tg: number, text: string) => {
    const { handleManagerUpdate } = await import("@/lib/server/manager");
    return handleManagerUpdate({ message: { chat: { id: tg }, from: { id: tg, first_name: "Vali" }, text } });
  };
  const press = async (tg: number, data: string) => {
    const { handleManagerUpdate } = await import("@/lib/server/manager");
    return handleManagerUpdate({ callback_query: { id: "c", data, from: { id: tg, first_name: "Vali" }, message: { chat: { id: tg }, message_id: 1 } } });
  };

  it("the person confirms in the bot; only the browser holding the secret can claim it, once", async () => {
    const { createLogin, claimLogin } = await import("@/lib/server/tglogin");
    const { code, secret } = await createLogin(UA);
    expect(await claimLogin(code, secret)).toBe("pending"); // not confirmed yet

    expect(await start(901, `/start login_${code}`)).toBe("login: asked to confirm");
    const ask = calls.filter((c) => c.method === "sendMessage").at(-1)!.body as { text: string; reply_markup: { inline_keyboard: { callback_data: string }[][] } };
    expect(ask.text).toContain("Chrome · macOS"); // which browser asked
    expect(ask.reply_markup.inline_keyboard[0][0].callback_data).toBe(`lg:${code}`);

    expect(await claimLogin(code, secret)).toBe("pending"); // /start alone logs nobody in
    expect(await press(901, `lg:${code}`)).toBe("login: approved");

    expect(await claimLogin(code, "f".repeat(48))).toBe("gone"); // a forwarded link without the secret gets nothing
    const got = await claimLogin(code, secret);
    expect(got).toMatchObject({ userId: expect.any(String) });
    expect(await claimLogin(code, secret)).toBe("gone"); // once

    const { userByTelegramId } = await import("@/lib/server/tglink");
    expect((await userByTelegramId(901))?.id).toBe((got as { userId: string }).userId); // first time in Telegram: the account is made
  });

  it("declining or a stale code logs nobody in", async () => {
    const { createLogin, claimLogin } = await import("@/lib/server/tglogin");
    const { code, secret } = await createLogin(UA);
    expect(await press(902, "lg:no")).toBe("login: declined");
    expect(await claimLogin(code, secret)).toBe("pending");
    expect(await press(902, `lg:${"a".repeat(24)}`)).toBe("login: expired"); // unknown code
    expect(await start(902, `/start login_${"b".repeat(24)}`)).toBe("login: bad code");
  });

  it("browser names are readable", async () => {
    const { browserName } = await import("@/lib/server/tglogin");
    expect(browserName(UA)).toBe("Chrome · macOS");
    expect(browserName("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Version/17 Mobile Safari/604.1")).toBe("Safari · iOS");
    expect(browserName("curl/8")).toBe("?");
  });
});
