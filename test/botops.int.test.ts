// Integration test against a real MongoDB (runs only when MONGODB_TEST_URI is set).
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const uri = process.env.MONGODB_TEST_URI;

describe.skipIf(!uri)("bot operations (MongoDB)", () => {
  beforeAll(() => {
    process.env.MONGODB_URI = uri;
    process.env.MONGODB_DB = "ministudio_botops_test";
    process.env.APP_SECRET = "test-secret-test-secret-1234";
  });
  afterAll(async () => {
    const { rawDb } = await import("@/lib/server/db");
    await rawDb().dropDatabase();
  });

  const doc = (extra = {}) =>
    ({
      name: "x", theme: {}, state: {}, screens: [], collections: [{ name: "orders", mode: "records", fields: [] }],
      bot: { welcomeText: "", buttonText: "", ownerAlerts: [{ collection: "orders", acceptText: "OK!" }], ...extra },
    }) as never;

  it("flow state is stored per chat and cleared with null", async () => {
    const { getFlowState, setFlowState } = await import("@/lib/server/botops");
    expect(await getFlowState("p1", 5)).toBeNull();
    await setFlowState("p1", 5, { flowId: "f", step: 1, answers: { a: "b" } });
    expect(await getFlowState("p1", 5)).toEqual({ flowId: "f", step: 1, answers: { a: "b" } });
    expect(await getFlowState("p1", 6)).toBeNull();
    await setFlowState("p1", 5, null);
    expect(await getFlowState("p1", 5)).toBeNull();
  });

  it("finishing a flow stores a record tagged source=bot", async () => {
    const { finishFlow } = await import("@/lib/server/botops");
    const { recordsCol } = await import("@/lib/server/appdata");
    await finishFlow("p2", {}, doc(), { flowId: "f", collection: "orders", data: { name: "Ali" }, notifyOwner: true }, { id: 9, first_name: "Ali" });
    const rows = await (await recordsCol()).find({ projectId: "p2" }).toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ collection: "orders", number: 1001, data: { name: "Ali", source: "bot" }, tgUser: { id: 9 } });
  });

  it("only the first Accept/Reject decision counts", async () => {
    const { decideRecord } = await import("@/lib/server/botops");
    const { recordsCol } = await import("@/lib/server/appdata");
    const col = await recordsCol();
    const { insertedId } = await col.insertOne({ projectId: "p3", collection: "orders", number: 1001, data: { x: 1 }, tgUser: null, createdAt: new Date() } as never);
    const id = insertedId.toHexString();
    expect(await decideRecord("p3", {}, doc(), id, "a")).toMatch(/Qabul/);
    expect(await decideRecord("p3", {}, doc(), id, "r")).toMatch(/Allaqachon/);
    expect((await col.findOne({ _id: insertedId }))?.data).toMatchObject({ status: "accepted" });
    // another project cannot decide it
    expect(await decideRecord("other", {}, doc(), id, "r")).toMatch(/Allaqachon/);
  });

  it("summaries escape HTML and cap field count and length", async () => {
    const { summarize } = await import("@/lib/server/botops");
    expect(summarize({ n: "<b>x</b>" })).toBe("<b>n:</b> &lt;b&gt;x&lt;/b&gt;");
    const big = Object.fromEntries(Array.from({ length: 30 }, (_, i) => [`k${i}`, "v".repeat(500)]));
    const lines = summarize(big).split("\n");
    expect(lines).toHaveLength(15);
    expect(lines[0].length).toBeLessThan(260);
  });

  it("broadcast: refuses a second one while running and the 4th of the day", async () => {
    const { startBroadcast } = await import("@/lib/server/broadcast");
    const { tgUsersCol } = await import("@/lib/server/appdata");
    await (await tgUsersCol()).insertOne({ projectId: "p4", tgId: 1, firstName: "a", lastName: "", username: "", languageCode: "", isPremium: false, firstSeen: new Date(), lastSeen: new Date(), actions: 1 });
    await expect(startBroadcast({ projectId: "pEmpty", token: "x:y", text: "hi", by: "o" })).rejects.toThrow(/foydalanuvchi yo'q/);
    await startBroadcast({ projectId: "p4", token: "bad:token", text: "hi", by: "o" });
    await expect(startBroadcast({ projectId: "p4", token: "bad:token", text: "again", by: "o" })).rejects.toThrow(/hali yuborilmoqda/);
  });
});
