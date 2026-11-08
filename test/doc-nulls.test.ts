import { describe, expect, it } from "vitest";
import { AppDocSchema } from "@/lib/types";
import { ensureIds } from "@/lib/doc";
import { cafeTemplate } from "@/lib/template";

// MongoDB stores `undefined` as null, so docs read back from the DB can carry nulls on optional fields.
function nullify(n: any): any {
  const out: any = { ...n };
  for (const k of ["children", "props", "style", "visibleIf", "events", "name"]) if (out[k] === undefined) out[k] = null;
  if (out.children) out.children = out.children.map(nullify);
  return out;
}

describe("documents read back from MongoDB", () => {
  it("accepts null on optional node fields and drops them", () => {
    const doc = cafeTemplate("X");
    const stored = { ...doc, screens: doc.screens.map(nullify) };
    const parsed = AppDocSchema.safeParse(stored);
    expect(parsed.success, JSON.stringify(parsed.error?.issues?.slice(0, 2))).toBe(true);
    const leaf = parsed.data!.screens[0].children![0].children![0];
    expect("children" in leaf && leaf.children === null).toBe(false);
  });

  it("ensureIds never leaves undefined keys behind (the driver would store them as null)", () => {
    const out = ensureIds([{ id: "a", type: "Screen", children: [{ id: "b", type: "Text" }] }]);
    expect(Object.keys(out[0].children![0])).not.toContain("children");
  });
});
