import { describe, expect, it } from "vitest";
import { addUsage, promptRecord } from "@/lib/server/usage";

describe("addUsage", () => {
  it("sums tokens across retries", () =>
    expect(addUsage({ inputTokens: 10, outputTokens: 5, model: "m", mock: false }, { input_tokens: 3, output_tokens: 2 })).toEqual({
      inputTokens: 13,
      outputTokens: 7,
      model: "m",
      mock: false,
    }));
  it("treats missing counts as zero", () =>
    expect(addUsage({ inputTokens: 1, outputTokens: 1, model: "m", mock: false }, {} as never)).toMatchObject({ inputTokens: 1, outputTokens: 1 }));
});

describe("promptRecord", () => {
  const base = {
    userId: "u1",
    userEmail: "a@x.uz",
    projectId: "p1",
    kind: "edit" as const,
    prompt: "  tugmani qizil qil  ",
    nodeId: "btn_add",
    usage: { inputTokens: 1200, outputTokens: 340, model: "claude-sonnet-5-5", mock: false },
    durationMs: 4210,
  };

  it("stores what was asked, by whom, with tokens and outcome", () => {
    const r = promptRecord({ ...base, status: "ok", message: "Tugma qizil bo'ldi", opsCount: 1 });
    expect(r).toMatchObject({
      userId: "u1",
      userEmail: "a@x.uz",
      projectId: "p1",
      kind: "edit",
      prompt: "tugmani qizil qil",
      nodeId: "btn_add",
      model: "claude-sonnet-5-5",
      mock: false,
      inputTokens: 1200,
      outputTokens: 340,
      totalTokens: 1540,
      durationMs: 4210,
      status: "ok",
      message: "Tugma qizil bo'ldi",
      opsCount: 1,
      error: null,
    });
    expect(r.at).toBeInstanceOf(Date);
  });

  it("keeps the error and truncates oversized text", () => {
    const r = promptRecord({ ...base, prompt: "x".repeat(10_000), status: "error", error: "AI javob bermadi" });
    expect(r.status).toBe("error");
    expect(r.error).toBe("AI javob bermadi");
    expect(r.prompt.length).toBe(4000);
    expect(r.message).toBeNull();
  });
});
