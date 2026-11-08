import { describe, expect, it } from "vitest";
import { badgeTone, buildColumns, coerceInput, guessRef, inferType, labelOf, normalizeType } from "@/lib/dataModel";

describe("inferType", () => {
  it("recognises money, numbers, booleans, lists and objects", () => {
    expect(inferType("price", [1000, 2000]).type).toBe("money");
    expect(inferType("people", [2, 3]).type).toBe("number");
    expect(inferType("paid", [true, false]).type).toBe("boolean");
    expect(inferType("items", [[{ id: 1 }], []]).type).toBe("list");
    expect(inferType("address", [{ street: "a" }]).type).toBe("object");
  });
  it("recognises dates, urls, images and phones", () => {
    expect(inferType("at", ["2026-11-08", "2026-11-09T10:00:00Z"]).type).toBe("date");
    expect(inferType("site", ["https://a.uz"]).type).toBe("url");
    expect(inferType("photo", ["https://a.uz/x"]).type).toBe("image");
    expect(inferType("pic", ["https://a.uz/x.png"]).type).toBe("image");
    expect(inferType("phone", ["+998 90 123 45 67"]).type).toBe("phone");
  });
  it("turns status-like columns and low-cardinality text into select", () => {
    expect(inferType("status", ["new", "paid", "new"])).toEqual({ type: "select", options: ["new", "paid"] });
    expect(inferType("city", ["a", "a", "a", "b", "b", "b", "a", "b"]).type).toBe("select");
    expect(inferType("note", ["one", "two", "three"]).type).toBe("text");
  });
  it("falls back to name hints when empty", () => expect(inferType("totalAmount", [null, ""]).type).toBe("money"));
});

describe("guessRef", () => {
  const names = ["products", "categories", "orders"];
  it("finds the collection a *Id field points to", () => {
    expect(guessRef("productId", names)).toBe("products");
    expect(guessRef("category_id", names)).toBe("categories");
    expect(guessRef("order_id", names)).toBe("orders");
    expect(guessRef("userId", names)).toBeNull();
    expect(guessRef("id", names)).toBeNull();
  });
});

describe("buildColumns", () => {
  it("declared fields first with labels/refs, then extra keys; relation wins", () => {
    const cols = buildColumns(
      [{ name: "item", type: "string", label: "Mahsulot", ref: "products" }, { name: "qty", type: "number" }],
      [{ item: "p1", qty: 2, note: "x", productId: 1 }],
      ["products"],
    );
    expect(cols.map((c) => [c.key, c.type, c.declared])).toEqual([["item", "relation", true], ["qty", "number", true], ["note", "text", false], ["productId", "relation", false]]);
    expect(cols[0]).toMatchObject({ label: "Mahsulot", ref: "products" });
  });
  it("a declared string can still be refined by its values", () =>
    expect(buildColumns([{ name: "status", type: "string" }], [{ status: "new" }, { status: "paid" }], [])[0]).toMatchObject({ type: "select", options: ["new", "paid"] }));
  it("declared options win over inferred", () =>
    expect(buildColumns([{ name: "s", type: "select", options: ["a", "b", "c"] }], [{ s: "a" }], [])[0].options).toEqual(["a", "b", "c"]));
  it("normalizeType maps AI type words", () => {
    expect(normalizeType("array")).toBe("list");
    expect(normalizeType("string")).toBe("text");
    expect(normalizeType("weird")).toBeNull();
  });
});

describe("helpers", () => {
  it("labelOf prefers name/title", () => {
    expect(labelOf({ id: "p1", name: "Osh" })).toBe("Osh");
    expect(labelOf({ id: "p1" })).toBe("p1");
    expect(labelOf(null)).toBe("");
  });
  it("badgeTone maps statuses", () => {
    expect(badgeTone("paid")).toBe("ok");
    expect(badgeTone("Kutilmoqda")).toBe("warn");
    expect(badgeTone("cancelled")).toBe("danger");
  });
  it("coerceInput validates numbers and dates", () => {
    expect(coerceInput("money", "1 200,5")).toBe(1200.5);
    expect(coerceInput("number", "abc")).toBeNull();
    expect(coerceInput("date", "2026-11-08")).toBe("2026-11-08");
    expect(coerceInput("date", "yesterday")).toBeNull();
    expect(coerceInput("boolean", "Ha")).toBe(true);
    expect(coerceInput("text", " a ")).toBe(" a ");
  });
});
