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

type FlowNodeRolloverInfo = {
  readonly phase: string;
  readonly remainingPercent?: number;
  readonly thresholdPercent?: number;
  readonly reportPath?: string;
  readonly error?: string;
  readonly updatedAt: number;
};

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
  // Snapshot pipeline is authoritative for lock/turn state.
  // Stream pipeline only updates token usage cache and message content.
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
  if (isRecord(event.data) && isRecord(event.data.tokenUsage)) {
    const used = readNumber(event.data.tokenUsage.used);
    const limit = readNumber(event.data.tokenUsage.limit);
    if (used !== null && limit !== null && limit > 0) {
      return { used, limit };
    }
  }

  return null;
};

const readTimestampMs = (value: unknown): number | null => {
  if (typeof value !== "string") {
    return null;
  }
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const extractRolloverInfo = (event: unknown): FlowNodeRolloverInfo | null => {
  if (!isRecord(event)) {
    return null;
  }

  const updatedAt = readTimestampMs(event.timestamp) ?? Date.now();

  // Flow node rollover notifications are sent as top-level events.
  if (event.kind === "flow_node_rollover") {
    const phase = readString(event.phase);
    if (!phase) {
      return null;
    }
    const remainingPercent = readNumber(event.remainingPercent);
    const thresholdPercent = readNumber(event.thresholdPercent);
    const reportPath = readString(event.reportPath);
    const error = readString(event.error);
    return {
      phase,
      ...(remainingPercent !== null ? { remainingPercent } : {}),
      ...(thresholdPercent !== null ? { thresholdPercent } : {}),
      ...(reportPath ? { reportPath } : {}),
      ...(error ? { error } : {}),
      updatedAt,
    };
  }

  // Continuity failures are emitted as stream events from core.
  if (event.type === "stream_event" && isRecord(event.data)) {
    if (event.data.kind !== "continuity_failed") {
      return null;
    }
    const error = readString(event.data.error);
    const reason = readString(event.data.reason);
    const composedError =
      error && reason ? `${reason}: ${error}` : error ?? reason ?? null;
    return {
      phase: "failed",
      ...(composedError ? { error: composedError } : {}),
      updatedAt,
    };
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

  const rollover = extractRolloverInfo(payload.event);
  if (rollover) {
    return {
      ...snapshots,
      [payload.sessionId]: {
        ...snapshot,
        status: {
          ...snapshot.status,
          rollover,
          updatedAt: Date.now(),
        },
      },
    };
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
