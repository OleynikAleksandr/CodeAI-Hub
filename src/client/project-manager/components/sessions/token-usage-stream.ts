import type { SessionSnapshots } from "../../../ui/src/session/helpers";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

type TokenUsageSnapshot = {
  readonly used: number;
  readonly limit: number;
};

const extractTokenUsage = (event: unknown): TokenUsageSnapshot | null => {
  if (!isRecord(event)) {
    return null;
  }

  if (isRecord(event.tokenUsage)) {
    const used = readNumber(event.tokenUsage.used);
    const limit = readNumber(event.tokenUsage.limit);
    if (used !== null && limit !== null && limit > 0) {
      return { used, limit };
    }
  }

  if (isRecord(event.data) && event.data.kind === "token_usage") {
    const used = readNumber(event.data.used);
    const limit = readNumber(event.data.limit);
    if (used !== null && limit !== null && limit > 0) {
      return { used, limit };
    }
  }

  return null;
};

export const updateSnapshotsWithTokenUsage = (
  snapshots: SessionSnapshots,
  payload: { readonly sessionId: string; readonly event: unknown }
): SessionSnapshots => {
  const snapshot = snapshots[payload.sessionId];
  if (!snapshot) {
    return snapshots;
  }

  const tokenUsage = extractTokenUsage(payload.event);
  if (!tokenUsage) {
    return snapshots;
  }

  return {
    ...snapshots,
    [payload.sessionId]: {
      ...snapshot,
      status: {
        ...snapshot.status,
        tokenUsage,
        updatedAt: Date.now(),
      },
    },
  };
};

