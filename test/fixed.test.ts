import { describe, expect, it } from "vitest";
import { lint } from "@/lib/server/ai";
import { cafeTemplate } from "@/lib/template";
import { GENERATE_SYSTEM, EDIT_SYSTEM } from "@/lib/spec";

describe("position: fixed", () => {
  it("is refused in AI documents (a fixed screen covered the whole studio), sticky stays fine", () => {
    const doc = cafeTemplate();
    expect(lint(doc)).toEqual([]);
    doc.screens[0].style = { ...doc.screens[0].style, position: "fixed", inset: 0 };
    expect(lint(doc).some((e) => e.includes('position "fixed" is not allowed'))).toBe(true);
    doc.screens[0].style = { position: "sticky", bottom: 0 };
    expect(lint(doc)).toEqual([]);
  });
  it("the AI is told not to use it (generate and edit prompts)", () => {
    for (const s of [GENERATE_SYSTEM, EDIT_SYSTEM]) expect(s).toContain('Never use position "fixed"');
  });
});
