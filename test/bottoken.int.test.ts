// Integration test (real MongoDB, runs only when MONGODB_TEST_URI is set). Telegram and sign-in are mocked.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const uri = process.env.MONGODB_TEST_URI;
const calls: { method: string; token: string }[] = [];
vi.mock("@/lib/server/telegram", async (orig) => ({
  ...(await orig<typeof import("@/lib/server/telegram")>()),
  tgApi: async (token: string, method: string) => {
    calls.push({ method, token });
    if (method === "getMe") {
      if (token.endsWith("BAD")) throw new Error("Unauthorized");
      return { username: "kafe_bot" };
    }
    return {};
  },
}));
let currentId = "";
vi.mock("@/lib/server/access", async () => {
  const { getProject } = await import("@/lib/server/projects");
  return { requireProject: async () => ({ project: (await getProject(currentId))!, user: { id: "u1", email: "o@x.uz" }, perms: { update: true, viaAdmin: false } }) };
});

const TOKEN = "123456789:AAH-valid_token_value_0123456789abc";

describe.skipIf(!uri)("connect an existing bot by token (MongoDB)", () => {
  beforeAll(() => {
    process.env.MONGODB_URI = uri;
    process.env.MONGODB_DB = "ministudio_bottoken_test";
    process.env.APP_SECRET = "test-secret-test-secret-1234";
    process.env.PUBLIC_URL = "https://panel.test";
  });
  afterAll(async () => {
    const { rawDb } = await import("@/lib/server/db");
    await rawDb().dropDatabase();
  });

  const post = async (token: unknown) => {
    const { POST } = await import("@/app/api/projects/[id]/bot/token/route");
    const r = await POST(new Request("https://panel.test/x", { method: "POST", body: JSON.stringify({ token }) }), { params: Promise.resolve({ id: currentId }) } as never);
    return { status: r.status, body: (await r.json()) as { botUsername?: string; error?: string } };
  };
  const project = async (slug: string, published: boolean) => {
    const { projects } = await import("@/lib/server/projects");
    const doc = { name: "Kafe", theme: { primary: "#e8590c", background: "#fff", text: "#111", radius: 12, font: "x" }, state: {}, collections: [], screens: [{ id: "s1", type: "Screen", name: "Bosh", children: [] }], bot: { welcomeText: "a", buttonText: "b" } };
    const r = await (await projects()).insertOne({ name: "Kafe", slug, doc, publishedDoc: published ? doc : null, publishedVersion: published ? 1 : 0, ownerId: "u1", createdAt: new Date(), updatedAt: new Date() } as never);
    currentId = r.insertedId.toHexString();
    return currentId;
  };

  it("a malformed token is refused before Telegram is asked", async () => {
    await project("t1", true);
    const before = calls.length;
    const r = await post("abc");
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/noto'g'ri/);
    expect(calls.length).toBe(before);
  });

  it("a token Telegram rejects is refused and nothing is saved", async () => {
    const id = await project("t2", true);
    const r = await post("123456789:AAH-valid_token_value_0123456789BAD");
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/qabul qilmadi/);
    const { getProject, envOf } = await import("@/lib/server/projects");
    expect(envOf((await getProject(id))!).BOT_TOKEN).toBeUndefined();
  });

  it("a good token is saved encrypted and, for a live app, the webhook is pointed here", async () => {
    const id = await project("t3", true);
    const before = calls.length;
    const r = await post(TOKEN);
    expect(r.status).toBe(200);
    expect(r.body.botUsername).toBe("kafe_bot");
    const { getProject, envOf } = await import("@/lib/server/projects");
    const p = (await getProject(id))!;
    expect(envOf(p).BOT_TOKEN).toBe(TOKEN);
    expect(p.envEnc).not.toContain(TOKEN); // encrypted at rest
    expect(p.botUsername).toBe("kafe_bot");
    expect(calls.slice(before).map((c) => c.method)).toEqual(expect.arrayContaining(["getMe", "setWebhook"]));
    // a second token for the same project is refused
    expect((await post(TOKEN)).status).toBe(409);
  });

  it("a project that is not published yet just stores the token (the webhook is set at the first publish)", async () => {
    await project("t4", false);
    const before = calls.length;
    expect((await post(TOKEN)).status).toBe(200);
    expect(calls.slice(before).map((c) => c.method)).not.toContain("setWebhook");
  });
});
