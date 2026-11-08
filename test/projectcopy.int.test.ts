// Integration test (real MongoDB, runs only when MONGODB_TEST_URI is set). Sign-in is mocked.
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const uri = process.env.MONGODB_TEST_URI;
let currentId = "";
vi.mock("@/lib/server/access", async () => {
  const { getProject } = await import("@/lib/server/projects");
  const user = { id: "u1", email: "o@x.uz", name: "O", isAdmin: false };
  return {
    requireUser: async () => user,
    requireProject: async () => ({ project: (await getProject(currentId))!, user, perms: { update: true, viaAdmin: false } }),
  };
});

const doc = { name: "Kafe", theme: { primary: "#e8590c", background: "#fff", text: "#111", radius: 12, font: "x" }, state: {}, collections: [], screens: [{ id: "s1", type: "Screen", name: "Bosh", children: [] }], bot: { welcomeText: "a", buttonText: "b" } };

describe.skipIf(!uri)("duplicate, export and import a project (MongoDB)", () => {
  beforeAll(() => {
    process.env.MONGODB_URI = uri;
    process.env.MONGODB_DB = "ministudio_copy_test";
    process.env.APP_SECRET = "test-secret-test-secret-1234";
  });
  afterAll(async () => {
    const { rawDb } = await import("@/lib/server/db");
    await rawDb().dropDatabase();
  });

  let n = 0;
  const source = async () => {
    const { projects } = await import("@/lib/server/projects");
    const { encryptEnv } = await import("@/lib/server/crypto");
    const r = await (await projects()).insertOne({ name: "Gul", slug: `gul${++n}`, doc, publishedDoc: doc, publishedVersion: 3, botUsername: "gul_bot", envEnc: encryptEnv({ BOT_TOKEN: "1:SECRET" }), ownerId: "u1", members: [{ userId: "u2", email: "a@b.uz", access: "view" }], createdAt: new Date(), updatedAt: new Date() } as never);
    currentId = r.insertedId.toHexString();
    return currentId;
  };

  it("a duplicate carries the design only: no bot, keys, versions or members", async () => {
    const id = await source();
    const { POST } = await import("@/app/api/projects/[id]/duplicate/route");
    const res = await POST(new Request("https://x/y", { method: "POST" }), { params: Promise.resolve({ id }) } as never);
    expect(res.status).toBe(201);
    const { _id } = (await res.json()) as { _id: string };
    const { getProject, envOf } = await import("@/lib/server/projects");
    const copy = (await getProject(_id))!;
    expect(copy.name).toBe("Gul (nusxa)");
    expect(copy.doc?.screens).toHaveLength(1);
    expect(copy.publishedVersion).toBe(0);
    expect(copy.botUsername).toBeUndefined();
    expect(envOf(copy).BOT_TOKEN).toBeUndefined();
    expect(copy.members ?? []).toHaveLength(0);
    expect(copy.slug).not.toBe("gul1");
  });

  it("export holds the app and never a key; import turns it back into a new project", async () => {
    const id = await source();
    const { GET } = await import("@/app/api/projects/[id]/export/route");
    const res = await GET(new Request("https://x/y"), { params: Promise.resolve({ id }) } as never);
    const text = await res.text();
    expect(res.headers.get("content-disposition")).toContain(".ministudio.json");
    expect(text).not.toContain("SECRET");
    expect(text).not.toContain("gul_bot");

    const { POST } = await import("@/app/api/projects/import/route");
    const ok = await POST(new Request("https://x/y", { method: "POST", body: text }));
    expect(ok.status).toBe(201);
    const { getProject } = await import("@/lib/server/projects");
    const imported = (await getProject(((await ok.json()) as { _id: string })._id))!;
    expect(imported.doc?.screens[0].id).toBe("s1");
    expect(imported.ownerId).toBe("u1");
  });

  it("import refuses what is not a MiniStudio export or has a broken document", async () => {
    const { POST } = await import("@/app/api/projects/import/route");
    const post = async (body: string) => POST(new Request("https://x/y", { method: "POST", body }));
    expect((await post("nope")).status).toBe(400);
    expect((await post(JSON.stringify({ format: "other", doc }))).status).toBe(400);
    expect((await post(JSON.stringify({ format: "ministudio.app", doc: { screens: "x" } }))).status).toBe(400);
  });
});
