import { describe, expect, it } from "vitest";
import { safeEqual } from "@/lib/server/safeEqual";

describe("safeEqual", () => {
  it("matches equal strings only", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
  it("never matches a missing value", () => {
    expect(safeEqual(null, "x")).toBe(false);
    expect(safeEqual(undefined, undefined)).toBe(false);
    expect(safeEqual("", null)).toBe(false);
  });
});
