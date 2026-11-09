import { describe, expect, it } from "vitest";
import { AppDocSchema } from "@/lib/types";
import { lint } from "@/lib/server/ai";
import { TEMPLATES, buildTemplate } from "@/lib/gallery";
import { templateStrings, translateDoc } from "@/lib/gallery/translate";
import CATALOG from "@/i18n/tpl";

const LANGS = ["kaa", "en", "ru"] as const;

describe("template translations", () => {
  it("every template string has a catalog entry", () => {
    const missing = new Set<string>();
    for (const t of TEMPLATES) for (const s of templateStrings(buildTemplate(t.id)!)) if (!(s in CATALOG)) missing.add(s);
    expect([...missing]).toEqual([]);
  });
  it("catalog entries are complete and Cyrillic stays out of Latin languages", () => {
    for (const [k, v] of Object.entries(CATALOG)) {
      expect(v, k).toHaveLength(3);
      if (v[0] === "=") continue;
      expect(v[0] && v[1] && v[2], k).toBeTruthy();
      expect(/[А-Яа-яЁё]/.test(v[0] + v[1]), `Cyrillic in ${k}`).toBe(false);
    }
  });
  for (const l of LANGS) {
    for (const { id } of TEMPLATES) {
      it(`${id} in ${l}: same structure, still a valid app, text changed`, () => {
        const uz = buildTemplate(id)!;
        const doc = translateDoc(uz, l);
        const shape = (d: unknown): unknown => JSON.parse(JSON.stringify(d, (k, v) => (typeof v === "string" && !["id", "type"].includes(k) && k !== "" ? undefined : v)));
        expect(shape(doc)).toEqual(shape(uz));
        expect(AppDocSchema.safeParse(doc).success).toBe(true);
        expect(lint(doc)).toEqual([]);
        expect(JSON.stringify(doc)).not.toBe(JSON.stringify(uz));
      });
    }
  }
  it("uzbek is returned as it is", () => {
    const d = buildTemplate("cafe")!;
    expect(translateDoc(d, "uz")).toBe(d);
  });
  it("a state default that a chip is compared against is translated like the chip", () => {
    for (const l of LANGS) {
      for (const id of ["flowers", "barber", "sushi", "dental", "courses"]) {
        const uz = buildTemplate(id)!;
        const d = translateDoc(uz, l);
        for (const k of ["day", "opt"]) {
          if (typeof uz.state[k] !== "string" || !uz.state[k]) continue;
          // the default must still appear as a chip label or data value somewhere in the translated doc
          const txt = JSON.stringify(d);
          const def = String(d.state[k]);
          expect(txt.split(JSON.stringify(def)).length - 1, `${id}/${l}/${k}=${def}`).toBeGreaterThan(1);
        }
      }
    }
  });
});
