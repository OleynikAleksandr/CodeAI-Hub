import type { TokenUsageSnapshot } from "./continuity-types";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const readFromKeys = (
  source: Record<string, unknown>,
  keys: readonly string[]
): number | null => {
  for (const key of keys) {
    const value = readNumber(source[key]);
    if (value !== null) {
      return value;
    }
  }
  return null;
};

const readSum = (
  source: Record<string, unknown>,
  keys: readonly string[]
): number | null => {
  let sum = 0;
  let found = false;
  for (const key of keys) {
    const value = readNumber(source[key]);
    if (value !== null) {
      sum += value;
      found = true;
    }
  }
  return found ? sum : null;
};

const extractUsagePayload = (
  event: Record<string, unknown>
): Record<string, unknown> | null => {
  if (isRecord(event.tokenUsage)) {
    return event.tokenUsage;
  }
  if (isRecord(event.usage)) {
    return event.usage;
  }
  return null;
};

export const extractTokenUsage = (
  event: unknown,
  timestamp = new Date().toISOString()
): TokenUsageSnapshot | null => {
  if (!isRecord(event)) {
    return null;
  }

  const payload = extractUsagePayload(event);
  if (!payload) {
    return null;
  }

  const usedDirect = readFromKeys(payload, [
    "used",
    "total_tokens",
    "totalTokens",
    "tokens",
    "token_count",
    "tokenCount",
  ]);

  const used =
    usedDirect ??
    readSum(payload, [
      "input_tokens",
      "output_tokens",
      "prompt_tokens",
      "completion_tokens",
    ]);

  const limit = readFromKeys(payload, [
    "limit",
    "max_tokens",
    "maxTokens",
    "context_window",
    "contextWindow",
    "token_limit",
    "max_context_tokens",
    "maxContextTokens",
  ]);

  if (used === null || limit === null || limit <= 0) {
    return null;
  }

  return {
    used,
    limit,
    updatedAt: timestamp,
  };
};
