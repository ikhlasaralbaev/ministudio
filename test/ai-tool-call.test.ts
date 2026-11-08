import { beforeEach, describe, expect, it, vi } from "vitest";
import { cafeTemplate } from "@/lib/template";

// Fake Anthropic client: records each request and replays scripted responses.
const calls: Record<string, unknown>[] = [];
let script: Record<string, unknown>[] = [];

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      stream: (req: Record<string, unknown>) => {
        calls.push(structuredClone(req));
        const res = script.shift() as { throws?: string } | undefined;
        return {
          finalMessage: async () => {
            if (res?.throws) throw new Error(res.throws);
            return res;
          },
        };
      },
    };
  },
}));

const usage = { input_tokens: 10, output_tokens: 5 };
const text = (t: string) => ({ stop_reason: "end_turn", usage, content: [{ type: "text", text: t }] });
const toolUse = (input: unknown) => ({
  stop_reason: "tool_use",
  usage,
  content: [{ type: "tool_use", id: "tu_1", name: "write_app", input }],
});

describe("generateApp tool calling", () => {
  beforeEach(() => {
    calls.length = 0;
    process.env.ANTHROPIC_API_KEY = "test";
    delete process.env.AI_MOCK;
  });

  it("does not force tool_choice (rejected by current models)", async () => {
    script = [toolUse(cafeTemplate("X"))];
    const { generateApp } = await import("@/lib/server/ai");
    await generateApp("kafe", [], "X");
    const choice = calls[0].tool_choice as { type: string } | undefined;
    expect(choice === undefined || choice.type === "auto").toBe(true);
  });

  it("asks again when the model answers with text instead of calling the tool", async () => {
    script = [text("Sure, here is your app!"), toolUse(cafeTemplate("X"))];
    const { generateApp } = await import("@/lib/server/ai");
    const { doc, usage: u } = await generateApp("kafe", [], "X");
    expect(doc.name).toBe("X");
    expect(calls).toHaveLength(2);
    const last = (calls[1].messages as { role: string; content: unknown }[]).at(-1);
    expect(last?.role).toBe("user");
    expect(JSON.stringify(last?.content)).toContain("write_app");
    expect(u.inputTokens).toBe(20); // both attempts are metered
  });

  it("uses the model chosen for the project", async () => {
    script = [toolUse(cafeTemplate("X"))];
    const { generateApp } = await import("@/lib/server/ai");
    const { usage: u } = await generateApp("kafe", [], "X", "claude-opus-5-5");
    expect(calls[0].model).toBe("claude-opus-5-5");
    expect(u.model).toBe("claude-opus-5-5");
  });

  it("gives up with a clear error after the retries are spent", async () => {
    script = [text("a"), text("b"), text("c")];
    const { generateApp } = await import("@/lib/server/ai");
    await expect(generateApp("kafe", [], "X")).rejects.toThrow();
    expect(calls).toHaveLength(3);
  });

  it("reports the tokens a failed request still spent", async () => {
    script = [text("a"), text("b"), text("c")];
    const { generateApp, AiError } = await import("@/lib/server/ai");
    const err = await generateApp("kafe", [], "X", "claude-haiku-5-5").catch((e) => e);
    expect(err).toBeInstanceOf(AiError);
    expect(err.usage).toMatchObject({ inputTokens: 30, outputTokens: 15, model: "claude-haiku-5-5" });
  });

  it("wraps API errors and keeps the tokens of earlier attempts", async () => {
    script = [text("a"), { throws: "overloaded" }];
    const { generateApp, AiError } = await import("@/lib/server/ai");
    const err = await generateApp("kafe", [], "X").catch((e) => e);
    expect(err).toBeInstanceOf(AiError);
    expect(err.message).toContain("overloaded");
    expect(err.usage.inputTokens).toBe(10);
  });
});
