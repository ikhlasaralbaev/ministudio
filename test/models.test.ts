import { describe, expect, it } from "vitest";
import { AI_MODELS, DEFAULT_AI_MODEL, resolveModel } from "@/lib/models";

describe("AI model choice", () => {
  it("offers the current Claude models", () =>
    expect(AI_MODELS.map((m) => m.id)).toEqual(["claude-opus-5-5", "claude-sonnet-5-5", "claude-haiku-5-5", "claude-fable-5-1"]));
  it("defaults to Sonnet 5.5", () => expect(DEFAULT_AI_MODEL).toBe("claude-sonnet-5-5"));
  it("keeps a listed model", () => expect(resolveModel("claude-opus-5-5")).toBe("claude-opus-5-5"));
  it("falls back to the default for unknown or missing values", () => {
    expect(resolveModel("gpt-5")).toBe(DEFAULT_AI_MODEL);
    expect(resolveModel(undefined)).toBe(DEFAULT_AI_MODEL);
    expect(resolveModel(42)).toBe(DEFAULT_AI_MODEL);
  });
});
