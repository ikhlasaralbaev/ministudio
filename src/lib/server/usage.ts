import "server-only";
import { db } from "./db";

export interface Usage {
  inputTokens: number;
  outputTokens: number;
  model: string;
  mock: boolean;
}

export const emptyUsage = (model: string, mock: boolean): Usage => ({ inputTokens: 0, outputTokens: 0, model, mock });

/** Adds one API response's token counts (retries included) to the running total. */
export function addUsage(a: Usage, b: { input_tokens?: number | null; output_tokens?: number | null }): Usage {
  return { ...a, inputTokens: a.inputTokens + (b?.input_tokens || 0), outputTokens: a.outputTokens + (b?.output_tokens || 0) };
}

const PROMPT_MAX = 4000;
const MESSAGE_MAX = 2000;

export interface PromptInput {
  userId: string;
  userEmail: string;
  projectId: string;
  kind: "generate" | "edit";
  prompt: string;
  nodeId?: string | null;
  usage: Usage;
  durationMs: number;
  status: "ok" | "error";
  message?: string | null;
  opsCount?: number | null;
  error?: string | null;
}

export type PromptRecord = ReturnType<typeof promptRecord>;

/** One AI request as stored in the prompt history ("usage" collection): who asked what, with which model, what it cost. */
export function promptRecord(e: PromptInput) {
  return {
    userId: e.userId,
    userEmail: e.userEmail,
    projectId: e.projectId,
    kind: e.kind,
    prompt: e.prompt.trim().slice(0, PROMPT_MAX),
    nodeId: e.nodeId ?? null,
    model: e.usage.model,
    mock: e.usage.mock,
    inputTokens: e.usage.inputTokens,
    outputTokens: e.usage.outputTokens,
    totalTokens: e.usage.inputTokens + e.usage.outputTokens,
    durationMs: Math.round(e.durationMs),
    status: e.status,
    message: e.message ? e.message.slice(0, MESSAGE_MAX) : null,
    opsCount: e.opsCount ?? null,
    error: e.error ? e.error.slice(0, MESSAGE_MAX) : null,
    at: new Date(),
  };
}

/** Every AI request is recorded, demo (mock) and failed ones included; metering totals skip mock rows. */
export async function recordPrompt(e: PromptInput): Promise<void> {
  await (await db()).collection("usage").insertOne(promptRecord(e));
}

export async function promptHistory(projectId: string, limit = 100) {
  return (await db())
    .collection<PromptRecord>("usage")
    .find({ projectId })
    .sort({ at: -1 })
    .limit(limit)
    .toArray();
}

export interface UsageTotal {
  requests: number;
  inputTokens: number;
  outputTokens: number;
}

export async function usageTotals(by: "userId" | "projectId", ids: string[]): Promise<Map<string, UsageTotal>> {
  if (!ids.length) return new Map();
  const rows = await (await db())
    .collection("usage")
    .aggregate<{ _id: string } & UsageTotal>([
      { $match: { [by]: { $in: ids }, mock: { $ne: true } } },
      {
        $group: {
          _id: "$" + by,
          requests: { $sum: 1 },
          inputTokens: { $sum: "$inputTokens" },
          outputTokens: { $sum: "$outputTokens" },
        },
      },
    ])
    .toArray();
  return new Map(rows.map(({ _id, ...t }) => [_id, t]));
}
