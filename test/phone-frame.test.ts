import { describe, expect, it } from "vitest";
import { isLight } from "@/components/studio/PhoneFrame";

describe("isLight", () => {
  it("treats white and pale colors as light", () => {
    expect(isLight("#ffffff")).toBe(true);
    expect(isLight("#fff8f3")).toBe(true);
    expect(isLight("#FFF")).toBe(true);
  });
  it("treats dark and saturated dark colors as dark", () => {
    expect(isLight("#0d0d10")).toBe(false);
    expect(isLight("#111")).toBe(false);
    expect(isLight("#10b981")).toBe(false);
  });
  it("falls back to light for non-hex values", () => expect(isLight("rgb(0,0,0)")).toBe(true));
});
