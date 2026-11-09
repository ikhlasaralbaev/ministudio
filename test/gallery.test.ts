import { describe, expect, it } from "vitest";
import { AppDocSchema, type UINode } from "@/lib/types";
import { lint } from "@/lib/server/ai";
import { TEMPLATES, buildTemplate, isTemplateId } from "@/lib/gallery";
import { LOCALES } from "@/i18n/config";

const ids = (nodes: UINode[]): string[] => nodes.flatMap((n) => [n.id, ...ids(n.children ?? [])]);

describe("template gallery", () => {
  it("offers twenty templates, each with a label and hint in every language", () => {
    expect(TEMPLATES).toHaveLength(20);
    for (const t of TEMPLATES) for (const l of LOCALES) {
      expect(t.label[l], `${t.id} label ${l}`).toBeTruthy();
      expect(t.hint[l], `${t.id} hint ${l}`).toBeTruthy();
    }
  });
  for (const { id } of TEMPLATES) {
    it(`${id}: valid app, passes lint, unique node ids, bot and owner alerts consistent`, () => {
      const doc = buildTemplate(id)!;
      const parsed = AppDocSchema.safeParse(doc);
      expect(parsed.success, JSON.stringify(parsed.error?.issues?.slice(0, 3))).toBe(true);
      expect(lint(doc)).toEqual([]);
      const all = doc.screens.flatMap((s) => ids([s]));
      expect(new Set(all).size).toBe(all.length);
      expect(doc.screens.length).toBeGreaterThanOrEqual(2);
      expect(doc.bot?.welcomeText).toBeTruthy();
    });
  }
  it("each build is a fresh copy and unknown ids are refused", () => {
    expect(buildTemplate("flowers")).not.toBe(buildTemplate("flowers"));
    expect(buildTemplate("nope")).toBeNull();
    expect(isTemplateId("cafe")).toBe(true);
    expect(isTemplateId("__proto__")).toBe(false);
  });
});
