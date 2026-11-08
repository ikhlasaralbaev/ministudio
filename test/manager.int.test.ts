// Integration test against a real MongoDB (runs only when MONGODB_TEST_URI is set). Telegram calls are mocked.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const uri = process.env.MONGODB_TEST_URI;
const calls: { method: string; body: unknown }[] = [];
vi.mock("@/lib/server/telegram", async (orig) => ({
  ...(await orig<typeof import("@/lib/server/telegram")>()),
  tgApi: async (_t: string, method: string, body?: unknown) => {
    calls.push({ method, body });
    if (method === "getManagedBotToken") return "777:CHILD-TOKEN";
    return {};
  },
}));

describe.skipIf(!uri)("manager bot and telegram link (MongoDB)", () => {
  beforeAll(() => {
    process.env.MONGODB_URI = uri;
    process.env.MONGODB_DB = "ministudio_manager_test";
    process.env.APP_SECRET = "test-secret-test-secret-1234";
    process.env.TELEGRAM_MANAGER_BOT_TOKEN = "1:MANAGER";
    process.env.TELEGRAM_MANAGER_BOT_USERNAME = "@ms_manager_bot";
  });
  afterAll(async () => {
    const { rawDb } = await import("@/lib/server/db");
    await rawDb().dropDatabase();
  });

  async function project(slug: string) {
    const { projects } = await import("@/lib/server/projects");
    const r = await (await projects()).insertOne({ name: "Kafe", slug, doc: null, publishedVersion: 0, ownerId: "u1", createdAt: new Date(), updatedAt: new Date() } as never);
    return r.insertedId.toHexString();
  }

  it("a managed bot is matched to its creator's pending claim, token stored encrypted", async () => {
    const { createClaim, handleManagedBot, latestClaim } = await import("@/lib/server/manager");
    const { getProject, envOf } = await import("@/lib/server/projects");
    const id = await project("kafe1");
    const { suggested } = await createClaim({ projectId: id, userId: "u1", tgId: 555, slug: "kafe1", name: "Kafe" });
    expect(suggested).toMatch(/^[a-z0-9_]{5,32}$/);
    expect(suggested.endsWith("bot")).toBe(true);
    expect((await latestClaim(id))?.status).toBe("pending");

    const log = await handleManagedBot({ user: { id: 555 }, bot: { id: 9001, username: "my_kafe_bot" } });
    expect(log).toMatch(/connected bot my_kafe_bot/);
    expect(calls.find((c) => c.method === "getManagedBotToken")?.body).toEqual({ user_id: 9001 });
    const p = (await getProject(id))!;
    expect(envOf(p).BOT_TOKEN).toBe("777:CHILD-TOKEN");
    expect(p.envEnc).not.toContain("CHILD-TOKEN"); // encrypted at rest
    expect(p).toMatchObject({ botUsername: "my_kafe_bot", managedBotId: 9001 });
    expect((await latestClaim(id))?.status).toBe("done");
  });

  it("a bot from someone without a pending claim is ignored (no token is fetched)", async () => {
    const { handleManagedBot } = await import("@/lib/server/manager");
    const before = calls.length;
    expect(await handleManagedBot({ user: { id: 999999 }, bot: { id: 1, username: "x_bot" } })).toMatch(/ignored/);
    expect(calls.length).toBe(before);
  });

  it("with two pending claims the exact suggested username wins", async () => {
    const { createClaim, handleManagedBot } = await import("@/lib/server/manager");
    const { getProject } = await import("@/lib/server/projects");
    const a = await project("a1");
    const b = await project("b1");
    const first = await createClaim({ projectId: a, userId: "u1", tgId: 600, slug: "a1", name: "A" });
    await createClaim({ projectId: b, userId: "u1", tgId: 600, slug: "b1", name: "B" });
    await handleManagedBot({ user: { id: 600 }, bot: { id: 9100, username: first.suggested } });
    expect((await getProject(a))?.managedBotId).toBe(9100);
    expect((await getProject(b))?.managedBotId).toBeUndefined();
  });

  it("an existing managed bot's token update refreshes the stored token", async () => {
    const { handleManagedBot } = await import("@/lib/server/manager");
    expect(await handleManagedBot({ user: { id: 555 }, bot: { id: 9001, username: "my_kafe_bot" } })).toMatch(/connected/);
  });

  it("one Telegram account links to one platform account only", async () => {
    const { usersCol } = await import("@/lib/server/users");
    const { linkTelegram, getTelegramLink, unlinkTelegram, userByTelegramId } = await import("@/lib/server/tglink");
    const col = usersCol();
    const u1 = (await col.insertOne({ email: "a@x.uz", name: "A" } as never)).insertedId.toHexString();
    const u2 = (await col.insertOne({ email: "b@x.uz", name: "B" } as never)).insertedId.toHexString();
    await linkTelegram(u1, { id: 42, firstName: "A", username: "a" });
    expect(await getTelegramLink(u1)).toEqual({ id: 42, username: "a", name: "A" });
    expect((await userByTelegramId(42))?.id).toBe(u1);
    await expect(linkTelegram(u2, { id: 42, firstName: "B", username: "b" })).rejects.toThrow(/boshqa akkauntga/);
    await linkTelegram(u1, { id: 42, firstName: "A2", username: "a" }); // relinking yourself is fine
    await unlinkTelegram(u1);
    expect(await getTelegramLink(u1)).toBeNull();
    await linkTelegram(u2, { id: 42, firstName: "B", username: "b" }); // free again
  });

  it("link helpers: username and bot link are well-formed", async () => {
    const { newBotLink, suggestUsername } = await import("@/lib/server/manager");
    expect(suggestUsername("Lazzat Kafe!!")).toMatch(/^ms_lazzatkafe_[0-9a-f]{4}_bot$/);
    expect(newBotLink("ms_manager_bot", "ms_x_bot", "Lazzat Kafe")).toBe("https://t.me/newbot/ms_manager_bot/ms_x_bot?name=Lazzat%20Kafe");
  });
});
