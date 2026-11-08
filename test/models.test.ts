import { describe, expect, it } from "vitest";
import { AI_MODELS, DEFAULT_AI_MODEL, resolveModel } from "@/lib/models";

describe("AI model choice", () => {
  it("offers the current Claude models", () =>
    expect(AI_MODELS.map((m) => m.id)).toEqual(["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-fable-5-1"]));
  it("defaults to Sonnet 5.5", () => expect(DEFAULT_AI_MODEL).toBe("claude-sonnet-5-5"));
  it("keeps a listed, enabled model", () => expect(resolveModel("claude-haiku-5-5")).toBe("claude-haiku-5-5"));
  it("Opus 5.5 and Fable 5.1 are disabled: still listed, but never used (projects that had them fall back to the default)", () => {
    for (const id of ["claude-opus-5-5", "claude-fable-5-1"]) {
      expect(AI_MODELS.find((m) => m.id === id)?.disabled).toBe(true);
      expect(resolveModel(id)).toBe(DEFAULT_AI_MODEL);
    }
  });
  it("falls back to the default for unknown or missing values", () => {
    expect(resolveModel("gpt-5")).toBe(DEFAULT_AI_MODEL);
    expect(resolveModel(undefined)).toBe(DEFAULT_AI_MODEL);
    expect(resolveModel(42)).toBe(DEFAULT_AI_MODEL);
  });
});
