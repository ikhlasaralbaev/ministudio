import { describe, expect, it } from "vitest";
import { applyRecordChange, toRow } from "@/lib/records";
import { cellText, exportTable, toCsv } from "@/lib/export";

const doc = (o: Record<string, unknown> = {}) => ({
  _id: "r1",
  number: 1001,
  collection: "orders",
  data: { amount: 5000, note: "Osh" },
  createdAt: new Date("2026-11-08T10:00:00Z"),
  ...o,
});

describe("toRow", () => {
  it("exposes data fields plus _id, _number and _at", () =>
    expect(toRow(doc())).toEqual({ amount: 5000, note: "Osh", _id: "r1", _number: 1001, _at: "2026-11-08T10:00:00.000Z" }));
  it("wraps non-object data as value", () => expect(toRow(doc({ data: 42 }))).toMatchObject({ value: 42, _id: "r1" }));
  it("data cannot override the system fields", () =>
    expect(toRow(doc({ data: { _id: "hack", _number: 1 } }))).toMatchObject({ _id: "r1", _number: 1001 }));
});

describe("applyRecordChange", () => {
  const a = { _id: "a", _number: 1, _at: "x", v: 1 };
  const b = { _id: "b", _number: 2, _at: "y", v: 2 };
  const base = { orders: [b, a] };
  it("insert puts the new row first", () =>
    expect(applyRecordChange(base, { type: "insert", collection: "orders", row: { _id: "c", _number: 3, _at: "z" } }).orders.map((r) => r._id)).toEqual(["c", "b", "a"]));
  it("insert into an unseen collection creates it", () =>
    expect(applyRecordChange(base, { type: "insert", collection: "bookings", row: a }).bookings).toEqual([a]));
  it("update replaces by _id", () =>
    expect(applyRecordChange(base, { type: "update", collection: "orders", row: { ...a, v: 9 } }).orders[1].v).toBe(9));
  it("delete removes by _id", () =>
    expect(applyRecordChange(base, { type: "delete", collection: "orders", id: "b" }).orders).toEqual([a]));
  it("does not mutate the input", () => {
    applyRecordChange(base, { type: "delete", collection: "orders", id: "b" });
    expect(base.orders).toHaveLength(2);
  });
});

describe("export", () => {
  it("cellText renders arrays of items by name with quantity", () =>
    expect(cellText([{ name: "Osh", qty: 2 }, { name: "Somsa" }])).toBe("Osh ×2, Somsa"));
  it("cellText renders plain values and objects", () => {
    expect(cellText(null)).toBe("");
    expect(cellText(true)).toBe("Ha");
    expect(cellText({ a: 1 })).toBe('{"a":1}');
  });
  it("exportTable builds fixed + discovered columns in first-seen order (dates in Tashkent time)", () => {
    const t = exportTable([
      { number: 1001, createdAt: new Date("2026-11-08T10:00:00Z"), tgUser: { id: 7, first_name: "Ali", username: "ali" }, data: { amount: 5, note: "a" } },
      { number: 1002, createdAt: new Date("2026-11-08T11:00:00Z"), tgUser: null, data: { amount: 6, phone: "+998" } },
    ]);
    expect(t.header).toEqual(["№", "Sana", "Foydalanuvchi", "Telegram ID", "amount", "note", "phone"]);
    expect(t.rows[0]).toEqual([1001, "2026-11-08 15:00", "Ali @ali", 7, 5, "a", ""]);
    expect(t.rows[1].slice(2, 4)).toEqual(["", ""]);
  });
  it("toCsv quotes when needed and starts with a BOM for Excel", () => {
    const csv = toCsv(["a", "b"], [["x,y", 'say "hi"'], [1, ""]]);
    expect(csv).toBe('﻿a,b\r\n"x,y","say ""hi"""\r\n1,\r\n');
  });
  it("toCsv neutralizes spreadsheet formulas", () => expect(toCsv(["a"], [["=HYPERLINK(1)"]])).toContain("'=HYPERLINK(1)"));
});

import { paymentsTable, usersTable, filterRows } from "@/lib/export";

describe("owner tables", () => {
  it("usersTable lists people with their record counts", () => {
    const t = usersTable(
      [
        {
          tgId: 7, firstName: "Ali", lastName: "Valiyev", username: "ali", languageCode: "uz", isPremium: true,
          firstSeen: new Date("2026-11-01T05:00:00Z"), lastSeen: new Date("2026-11-08T05:00:00Z"), actions: 12,
        },
      ],
      new Map([[7, 3]]),
    );
    expect(t.header).toEqual(["Ism", "Username", "Telegram ID", "Til", "Premium", "Birinchi kirish", "Oxirgi kirish", "Amallar", "Yozuvlar"]);
    expect(t.rows[0]).toEqual(["Ali Valiyev", "@ali", 7, "uz", "Ha", "2026-11-01 10:00", "2026-11-08 10:00", 12, 3]);
  });
  it("paymentsTable shows amount, status and payer", () => {
    const t = paymentsTable([
      { orderId: "1001", provider: "click", amount: 38000, status: "paid", description: "Osh", createdAt: new Date("2026-11-08T05:00:00Z"), tgUser: { id: 7, first_name: "Ali" } },
    ]);
    expect(t.header).toEqual(["№", "Sana", "Provayder", "Summa", "Holat", "Izoh", "Foydalanuvchi", "Telegram ID"]);
    expect(t.rows[0]).toEqual(["1001", "2026-11-08 10:00", "Click", 38000, "To'langan", "Osh", "Ali", 7]);
  });
  it("filterRows matches any cell case-insensitively", () => {
    const t = { header: ["a", "b"], rows: [["Osh", 1], ["Somsa", 2]] };
    expect(filterRows(t, "osh").rows).toEqual([["Osh", 1]]);
    expect(filterRows(t, "").rows).toHaveLength(2);
  });
});
