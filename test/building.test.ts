import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearBuilding, isBuilding, markBuilding } from "@/lib/building";
import { APP_DICT } from "@/i18n/app";
import { LOCALES } from "@/i18n/config";

function fakeStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}

describe("building flag (dashboard -> Studio)", () => {
  beforeEach(() => vi.stubGlobal("sessionStorage", fakeStorage()));
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("is set, seen and cleared", () => {
    expect(isBuilding()).toBe(false);
    markBuilding();
    expect(isBuilding()).toBe(true);
    clearBuilding();
    expect(isBuilding()).toBe(false);
  });
  it("a stale flag (older than 10 minutes) does not trap the page on the loading screen", () => {
    vi.useFakeTimers();
    markBuilding();
    vi.setSystemTime(Date.now() + 11 * 60_000);
    expect(isBuilding()).toBe(false);
  });
  it("blocked storage never throws", () => {
    vi.stubGlobal("sessionStorage", { getItem: () => { throw new Error("x"); }, setItem: () => { throw new Error("x"); }, removeItem: () => { throw new Error("x"); } });
    expect(() => markBuilding()).not.toThrow();
    expect(isBuilding()).toBe(false);
    expect(() => clearBuilding()).not.toThrow();
  });
});

describe("building screen texts", () => {
  it("every language has a title, a hint and the same number of status lines", () => {
    const n = APP_DICT.ru.build.phrases.length;
    expect(n).toBeGreaterThanOrEqual(6);
    for (const l of LOCALES) {
      const b = APP_DICT[l].build;
      expect(b.title.length).toBeGreaterThan(3);
      expect(b.hint.length).toBeGreaterThan(10);
      expect(b.phrases).toHaveLength(n);
      expect(new Set(b.phrases).size).toBe(n); // no repeated lines
    }
  });
});
