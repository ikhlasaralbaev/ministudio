// Integration test against a real MongoDB (runs only when MONGODB_TEST_URI is set).
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const uri = process.env.MONGODB_TEST_URI;

describe.skipIf(!uri)("data view and schema (MongoDB)", () => {
  const pid = "proj1";
  const doc = {
    name: "x", theme: {}, state: {},
    collections: [
      { name: "products", mode: "static", fields: [{ name: "id", type: "string" }, { name: "price", type: "number" }], data: [{ id: "p1", name: "Osh", price: 38000 }, { id: "p2", name: "Somsa", price: 12000 }] },
      { name: "orders", label: "Buyurtmalar", mode: "records", fields: [{ name: "status", type: "string" }] },
      { name: "reviews", mode: "records", fields: [] },
    ],
    screens: [{ id: "s1", type: "Screen", name: "Menyu", children: [{ id: "l", type: "List", props: { source: "collections.products" } }, { id: "b", type: "Button", events: { onClick: [{ type: "if", cond: "true", then: [{ type: "dbInsert", collection: "orders", value: "{}" }] }] } }] }],
    bot: { welcomeText: "", buttonText: "", flows: [{ id: "fb", saveTo: "reviews", done: "ok", steps: [{ key: "t", ask: "?" }] }], ownerAlerts: [{ collection: "orders" }] },
  };
  const project = { name: "x", slug: "x", doc, publishedDoc: doc, publishedVersion: 1 } as never;

  beforeAll(async () => {
    process.env.MONGODB_URI = uri;
    process.env.MONGODB_DB = "ministudio_dataview_test";
    process.env.APP_SECRET = "test-secret-test-secret-1234";
    const { recordsCol, tgUsersCol } = await import("@/lib/server/appdata");
    const col = await recordsCol();
    const statuses = ["new", "paid", "new", "rejected"];
    await col.insertMany(
      statuses.map((status, i) => ({
        projectId: pid, collection: "orders", number: 1001 + i,
        data: { customer: `C${i}`, status, total: 1000 * (i + 1), items: [{ id: "p1", qty: 1 + i }], phone: "+998901234567" },
        tgUser: { id: 10 + i, first_name: `U${i}` }, createdAt: new Date(Date.now() - i * 1000),
      })) as never,
    );
    await col.insertOne({ projectId: pid, collection: "reviews", number: 1001, data: { productId: "p1", stars: 5 }, tgUser: null, createdAt: new Date() } as never);
    await (await tgUsersCol()).insertOne({ projectId: pid, tgId: 10, firstName: "U0", lastName: "", username: "u0", languageCode: "uz", isPremium: false, firstSeen: new Date(), lastSeen: new Date(), actions: 1 });
  });
  afterAll(async () => {
    const { rawDb } = await import("@/lib/server/db");
    await rawDb().dropDatabase();
  });

  const q = (o: Record<string, unknown> = {}) => ({ source: "orders", q: "", page: 1, sort: "", dir: "desc" as const, filters: {}, tgId: null, ...o });

  it("orders table: typed columns with declared label, inferred types and system columns", async () => {
    const { viewTable } = await import("@/lib/server/dataview");
    const v = await viewTable(pid, project, q());
    expect(v.total).toBe(4);
    expect(v.editable).toBe(true);
    const types = Object.fromEntries(v.columns.map((c) => [c.key, c.type]));
    expect(types).toMatchObject({ _number: "number", _at: "date", status: "select", total: "money", items: "list", phone: "phone" });
    expect(v.columns.find((c) => c.key === "status")?.options).toEqual(expect.arrayContaining(["new", "paid", "rejected"]));
  });

  it("sorts, filters by select value and searches", async () => {
    const { viewTable } = await import("@/lib/server/dataview");
    expect((await viewTable(pid, project, q({ sort: "total", dir: "asc" }))).rows.map((r) => r.cells.total)).toEqual([1000, 2000, 3000, 4000]);
    expect((await viewTable(pid, project, q({ filters: { status: "new" } }))).total).toBe(2);
    expect((await viewTable(pid, project, q({ q: "c3" }))).total).toBe(1);
    expect((await viewTable(pid, project, q({ tgId: 11 }))).total).toBe(1);
  });

  it("users table is typed too", async () => {
    const { viewTable } = await import("@/lib/server/dataview");
    const v = await viewTable(pid, project, q({ source: "users" }));
    expect(v.editable).toBe(false);
    expect(v.rows[0].cells).toMatchObject({ name: "U0", username: "@u0", records: 1 });
    expect(v.columns.find((c) => c.key === "premium")?.type).toBe("boolean");
  });

  it("schema: nodes with usage and bot info, and the relations between tables", async () => {
    const { buildSchema } = await import("@/lib/server/dataview");
    const { nodes, edges } = await buildSchema(pid, project);
    const node = (n: string) => nodes.find((x) => x.name === n)!;
    expect(nodes.map((n) => n.name).sort()).toEqual(["bot", "orders", "payments", "products", "reviews", "users"]);
    expect(node("orders")).toMatchObject({ label: "Buyurtmalar", kind: "records", count: 4, usedIn: ["Menyu"] });
    expect(node("orders").bot).toContain("Egaga Qabul/Rad tugmalari");
    expect(node("products")).toMatchObject({ kind: "static", count: 2, usedIn: ["Menyu"] });
    expect(node("reviews").bot[0]).toMatch(/fb/);
    const has = (from: string, to: string, kind: string) => edges.some((e) => e.from === from && e.to === to && e.kind === kind);
    expect(has("orders", "products", "items")).toBe(true); // items[].id are catalog ids
    expect(has("reviews", "products", "ref")).toBe(true); // productId -> products
    expect(has("orders", "users", "user")).toBe(true);
    expect(has("payments", "users", "user")).toBe(true);
    expect(has("bot", "reviews", "bot")).toBe(true);
  });
});
