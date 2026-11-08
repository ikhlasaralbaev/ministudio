import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveIdeaDraft, takeIdeaDraft } from "@/lib/draft";

function fakeStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
}

describe("idea draft (landing -> sign in -> dashboard)", () => {
  beforeEach(() => vi.stubGlobal("localStorage", fakeStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("what was typed on the landing page comes back once", () => {
    saveIdeaDraft("Nukusdagi gul do'koni uchun katalog");
    expect(takeIdeaDraft()).toBe("Nukusdagi gul do'koni uchun katalog");
    expect(takeIdeaDraft()).toBe(""); // taken: it does not come back on the next visit
  });
  it("the last version wins, and clearing the box clears the draft", () => {
    saveIdeaDraft("birinchi");
    saveIdeaDraft("ikkinchi variant");
    expect(takeIdeaDraft()).toBe("ikkinchi variant");
    saveIdeaDraft("matn");
    saveIdeaDraft("   ");
    expect(takeIdeaDraft()).toBe("");
  });
  it("a draft older than a day is ignored", () => {
    vi.useFakeTimers();
    saveIdeaDraft("eski g'oya");
    vi.setSystemTime(Date.now() + 25 * 3600_000);
    expect(takeIdeaDraft()).toBe("");
    vi.useRealTimers();
  });
  it("garbage in storage and blocked storage never throw", () => {
    localStorage.setItem("ms:idea-draft", "{not json");
    expect(takeIdeaDraft()).toBe("");
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); }, removeItem: () => { throw new Error("blocked"); } });
    expect(() => saveIdeaDraft("x")).not.toThrow();
    expect(takeIdeaDraft()).toBe("");
  });
  it("is capped so a huge paste cannot fill the storage", () => {
    saveIdeaDraft("a".repeat(5000));
    expect(takeIdeaDraft().length).toBe(2000);
  });
});

import { ideaDraftScript } from "@/lib/draft";

describe("ideaDraftScript (typed before the page hydrates)", () => {
  it("saves what is typed in the landing box in the format takeIdeaDraft reads", () => {
    vi.stubGlobal("localStorage", fakeStorage());
    let handler: ((e: unknown) => void) | undefined;
    const doc = { addEventListener: (_t: string, h: (e: unknown) => void) => (handler = h) };
    new Function("document", ideaDraftScript(".prompt textarea"))(doc);
    const box = (value: string, ok = true) => ({ target: { value, matches: (sel: string) => ok && sel === ".prompt textarea" } });
    handler!(box("Nukusdagi gul do'koni uchun katalog"));
    expect(takeIdeaDraft()).toBe("Nukusdagi gul do'koni uchun katalog");
    handler!(box("boshqa maydon", false)); // typing elsewhere on the page is ignored
    expect(takeIdeaDraft()).toBe("");
    handler!(box("qaytadan matn"));
    handler!(box("   ")); // emptied
    expect(takeIdeaDraft()).toBe("");
    vi.unstubAllGlobals();
  });
});
