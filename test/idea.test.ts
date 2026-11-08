import { describe, expect, it } from "vitest";
import { looksLikeIdea, nameFromIdea } from "@/lib/idea";

describe("looksLikeIdea", () => {
  it("accepts a described idea", () => {
    expect(looksLikeIdea("Nukusdagi gul do'koni uchun katalog va yetkazib berish")).toBe(true);
    expect(looksLikeIdea("кофейня с меню и доставкой")).toBe(true);
  });
  it("rejects greetings and fragments, so small talk never creates a project", () => {
    for (const t of ["salom", "привет", "hello there", "ok", "   ", "gul do'koni"]) expect(looksLikeIdea(t)).toBe(false);
  });
});

describe("nameFromIdea", () => {
  it("short ideas become the name as they are", () => expect(nameFromIdea("Lazzat Kafe menyu")).toBe("Lazzat Kafe menyu"));
  it("long ideas are cut at a word boundary with an ellipsis", () => {
    const n = nameFromIdea("Nukusdagi gul do'koni uchun katalog, yetkazib berish va Click orqali to'lov qabul qilish");
    expect(n.length).toBeLessThanOrEqual(41);
    expect(n.endsWith("…")).toBe(true);
    expect(n).not.toMatch(/\s…$/);
  });
  it("uses only the first line and never returns an empty name", () => {
    expect(nameFromIdea("Birinchi qator\nikkinchi qator")).toBe("Birinchi qator");
    expect(nameFromIdea("   ")).toBe("Yangi loyiha");
  });
});
