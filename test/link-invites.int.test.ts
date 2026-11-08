// Integration test against a real MongoDB. Runs only when MONGODB_TEST_URI is set, e.g.
//   MONGODB_TEST_URI=mongodb://127.0.0.1:27017 npm test
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const uri = process.env.MONGODB_TEST_URI;

describe.skipIf(!uri)("linkInvites (MongoDB)", () => {
  beforeAll(() => {
    process.env.MONGODB_URI = uri;
    process.env.MONGODB_DB = "ministudio_linkinvites_test";
  });
  afterAll(async () => {
    const { rawDb } = await import("@/lib/server/db");
    await rawDb().dropDatabase();
  });

  it("attaches a pending invite to the user who signs in with a differently-cased email", async () => {
    const { projects, linkInvites } = await import("@/lib/server/projects");
    const col = await projects();
    const member = (email: string, userId: string | null) => ({
      userId, email, access: "read" as const, manageMembers: false, deleteProject: false, addedBy: "o", addedAt: new Date(),
    });
    const { insertedId } = await col.insertOne({
      name: "p", slug: "s" + Date.now(), doc: null, publishedVersion: 0, ownerId: "o",
      members: [member("ali@gmail.com", null), member("other@x.uz", null), member("ali2@gmail.com", "u2")],
      createdAt: new Date(), updatedAt: new Date(),
    });

    await linkInvites("u1", "  Ali@Gmail.COM ");

    const p = await col.findOne({ _id: insertedId });
    expect(p?.members?.find((m) => m.email === "ali@gmail.com")?.userId).toBe("u1");
    expect(p?.members?.find((m) => m.email === "other@x.uz")?.userId).toBeNull();
    expect(p?.members?.find((m) => m.email === "ali2@gmail.com")?.userId).toBe("u2");
  });
});
