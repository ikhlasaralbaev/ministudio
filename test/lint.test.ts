import { describe, expect, it } from "vitest";
import { lint } from "@/lib/server/ai";
import { cafeTemplate } from "@/lib/template";
import type { Action, AppDoc } from "@/lib/types";

function withButton(onClick: Action[]): AppDoc {
  const doc = cafeTemplate("X");
  doc.screens[0].children!.push({ id: "btn_t", type: "Button", events: { onClick } });
  return doc;
}

describe("lint: record actions", () => {
  it("accepts dbUpdate / dbDelete on a records collection", () =>
    expect(
      lint(
        withButton([
          { type: "dbUpdate", collection: "orders", id: "item._id", value: "{ status: 'done' }" },
          { type: "dbDelete", collection: "orders", id: "item._id" },
        ]),
      ),
    ).toEqual([]));
  it("flags unknown or static collections", () => {
    const errs = lint(
      withButton([
        { type: "dbInsert", collection: "nope", value: "{}" },
        { type: "dbDelete", collection: "products", id: "item._id" },
      ]),
    );
    expect(errs.join("\n")).toContain('unknown records collection "nope"');
    expect(errs.join("\n")).toContain('unknown records collection "products"');
  });
  it("checks the id and value expressions", () =>
    expect(lint(withButton([{ type: "dbUpdate", collection: "orders", id: "item._id(", value: "{" }])).length).toBe(2));
});
