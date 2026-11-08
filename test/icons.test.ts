import { describe, expect, it } from "vitest";
import { iconUrl, parseIcon } from "@/lib/icons";
import { lint } from "@/lib/server/ai";
import { SPEC } from "@/lib/spec";
import { AppDocSchema } from "@/lib/types";
import { cafeTemplate } from "@/lib/template";
import { barberTemplate, courseTemplate } from "@/lib/templates";

const doc = (children: unknown[]) =>
  AppDocSchema.parse({
    name: "x",
    theme: { primary: "#e8590c", background: "#fff", text: "#111", radius: 12, font: "x" },
    screens: [{ id: "s1", type: "Screen", children }],
  });

describe("Icon names", () => {
  it("parses a plain name, a weight suffix and a weight prop", () => {
    expect(parseIcon("shopping-cart")).toEqual({ base: "shopping-cart", weight: "bold" });
    expect(parseIcon("shopping-cart-fill")).toEqual({ base: "shopping-cart", weight: "fill" });
    expect(parseIcon("house", "regular")).toEqual({ base: "house", weight: "regular" });
    expect(parseIcon("  Check-Circle ")).toEqual({ base: "check-circle", weight: "bold" });
  });
  it("rejects made-up names", () => {
    for (const n of ["shoppingcart", "cart", "", "fa-home", "house-fancy", "../x"]) expect(parseIcon(n)).toBeNull();
  });
  it("every icon the prompt recommends really exists", () => {
    const line = SPEC.slice(SPEC.indexOf("Names: ") + 7, SPEC.indexOf("(any other valid Phosphor name works)"));
    const names = line.split(/\s+/).filter(Boolean);
    expect(names.length).toBeGreaterThan(30);
    expect(names.filter((n) => !parseIcon(n))).toEqual([]);
  });
});

describe("iconUrl", () => {
  it("builds an Iconify URL tinted with the color, regular without a suffix", () => {
    expect(iconUrl("shopping-cart", "#e8590c")).toBe("https://api.iconify.design/ph/shopping-cart-bold.svg?color=%23e8590c");
    expect(iconUrl("house", "#fff", "regular")).toBe("https://api.iconify.design/ph/house.svg?color=%23fff");
    expect(iconUrl("house", "red; drop")).toContain("color=%23111111"); // an invalid color falls back, nothing is injected
    expect(iconUrl("nope", "#000")).toBeNull();
  });
});

describe("lint: Icon and emoji", () => {
  const icon = (props: Record<string, unknown>) => ({ id: "ico_1", type: "Icon", props });
  it("accepts a valid Icon, flags a missing or invented name", () => {
    expect(lint(doc([icon({ name: "star", size: 20 })]))).toEqual([]);
    expect(lint(doc([icon({})])).join()).toMatch(/needs props\.name/);
    expect(lint(doc([icon({ name: "cartoon-cart" })])).join()).toMatch(/not a Phosphor icon name/);
  });
  it("emoji in text is an error for new apps (noEmoji), allowed otherwise", () => {
    const d = doc([{ id: "btn_1", type: "Button", props: { text: "🛒 Savat" } }, { id: "txt_1", type: "Text", props: { text: "Rahmat ✓" } }]);
    expect(lint(d)).toEqual([]);
    const errs = lint(d, { noEmoji: true });
    expect(errs).toHaveLength(2);
    expect(errs[0]).toContain("use an Icon node");
  });
  it("normal punctuation and © ™ are not mistaken for emoji", () => {
    const d = doc([{ id: "txt_1", type: "Text", props: { text: "© 2026 Kafe™ — 12 000 so'm → Menyu • ok" } }]);
    expect(lint(d, { noEmoji: true })).toEqual([]);
  });
});

describe("starter templates use icons, not emoji", () => {
  for (const [name, make] of [["cafe", cafeTemplate], ["barber", barberTemplate], ["course", courseTemplate]] as const) {
    it(`${name} has no emoji in its UI`, () => expect(lint(make(), { noEmoji: true })).toEqual([]));
  }
});
