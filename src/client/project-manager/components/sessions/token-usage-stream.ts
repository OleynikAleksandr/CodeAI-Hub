import type { SessionSnapshots } from "../../../ui/src/session/helpers";
import { writeLastKnownTokenUsage } from "../../../ui/src/session/token-usage-cache";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readString = (value: unknown): string | null =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const readNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    const parsed = Number.parseFloat(normalized);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

type TokenUsageSnapshot = { readonly used: number; readonly limit: number };

const resolveProviderSessionIdForCache = (
  snapshot: SessionSnapshots[string],
  event: unknown
): string | null => {
  const fromBinding = snapshot.binding.providerSessionId;
  if (fromBinding) {
    return fromBinding;
  }
  if (!isRecord(event)) {
    return null;
  }
  return readString(event.claudeSessionId);
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

  const providerSessionId = resolveProviderSessionIdForCache(
    snapshot,
    payload.event
  );
  if (providerSessionId) {
    writeLastKnownTokenUsage(providerSessionId, tokenUsage);
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
