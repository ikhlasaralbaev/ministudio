import { describe, expect, it } from "vitest";
import { AppDocSchema } from "@/lib/types";
import { lint } from "@/lib/server/ai";
import { cafeTemplate } from "@/lib/template";
import { barberTemplate, courseTemplate } from "@/lib/templates";

describe("starter templates are valid apps", () => {
  for (const [name, make] of [["cafe", cafeTemplate], ["barber", barberTemplate], ["course", courseTemplate]] as const) {
    it(`${name} passes the schema and lint`, () => {
      const doc = make();
      const parsed = AppDocSchema.safeParse(doc);
      expect(parsed.success, JSON.stringify(parsed.error?.issues?.slice(0, 3))).toBe(true);
      expect(lint(doc)).toEqual([]);
    });
  }
});
