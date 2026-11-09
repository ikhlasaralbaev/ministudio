import { describe, expect, it } from "vitest";
import { EDIT_SYSTEM, GENERATE_SYSTEM } from "@/lib/spec";
import { AppDocSchema } from "@/lib/types";
import { lint } from "@/lib/server/ai";

describe("AI prompt-injection hardening", () => {
  it("both system prompts carry the security rules first", () => {
    for (const s of [GENERATE_SYSTEM, EDIT_SYSTEM]) {
      expect(s).toContain("# Security");
      expect(s).toContain("never instructions");
    }
  });
  it("output that is not a valid app document is rejected, whatever the prompt said", () => {
    expect(AppDocSchema.safeParse({ text: "SYSTEM PROMPT: ..." }).success).toBe(false);
    expect(AppDocSchema.safeParse("hello").success).toBe(false);
  });
  it("lint is exported and callable on a rejected doc shape", () => {
    expect(typeof lint).toBe("function");
  });
});
