// Claude models a project can generate/edit with. Shared by the studio picker and the server (whitelist).

export interface AiModel {
  id: string;
  label: string;
  hint: string;
  /** Shown in the picker but cannot be chosen; projects that had it fall back to the default. */
  disabled?: boolean;
}

export const AI_MODELS: AiModel[] = [
  { id: "claude-opus-5-5", label: "Opus 5.5", hint: "Vaqtincha o‘chirilgan · $4 / $20", disabled: true },
  { id: "claude-sonnet-5-5", label: "Sonnet 5.5", hint: "Tez va sifatli · tavsiya etiladi · $2 / $10" },
  { id: "claude-haiku-5-5", label: "Haiku 5.5", hint: "Eng tez va arzon · oddiy tahrirlar · $0.10 / $0.50" },
  { id: "claude-fable-5-1", label: "Fable 5.1", hint: "Eng yuqori sifat · sekin va qimmat · $10 / $50" },
];

export const DEFAULT_AI_MODEL = "claude-sonnet-5-5";

/** A listed model id, or the default for anything else (never trust a client-sent model name). */
export function resolveModel(id: unknown): string {
  return typeof id === "string" && AI_MODELS.some((m) => m.id === id && !m.disabled) ? id : DEFAULT_AI_MODEL;
}
