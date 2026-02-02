export type TokenUsageSnapshot = {
  readonly used: number;
  readonly limit: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toPositiveInteger = (value: unknown): number | null => {
  if (typeof value !== "number") {
    return null;
  }
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }
  return Math.floor(value);
};

const extractTokenCountFromEvent = (
  event: unknown
): TokenUsageSnapshot | null => {
  if (!isRecord(event)) {
    return null;
  }

  // Look for token_count event type
  if (event.type !== "token_count") {
    return null;
  }

  const info = isRecord(event.info) ? event.info : null;
  if (!info) {
    return null;
  }

  // Extract last_token_usage.total_tokens as used
  const lastTokenUsage = isRecord(info.last_token_usage)
    ? info.last_token_usage
    : null;
  const used = lastTokenUsage
    ? toPositiveInteger(lastTokenUsage.total_tokens)
    : null;

  // Extract model_context_window as limit
  const limit = toPositiveInteger(info.model_context_window);

  if (used === null || limit === null || limit === 0) {
    return null;
  }

  return { used, limit };
};

export const extractLatestSnapshotFromRollout = (
  events: unknown[]
): TokenUsageSnapshot | null => {
  // Iterate in reverse to find the latest token_count event
  for (let i = events.length - 1; i >= 0; i--) {
    const snapshot = extractTokenCountFromEvent(events[i]);
    if (snapshot) {
      return snapshot;
    }
  }
  return null;
};

export const calculateRemainingPercent = (payload: {
  readonly used: number;
  readonly limit: number;
}): number => {
  if (payload.limit === 0) {
    return 0;
  }
  const remaining = payload.limit - payload.used;
  return Math.round((remaining / payload.limit) * 100);
};
