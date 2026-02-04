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

type TokenUsageSnapshot = {
  readonly used: number;
  readonly limit: number;
};

type FlowNodeRolloverNotification = {
  readonly kind: "flow_node_rollover";
  readonly phase: string;
  readonly remainingPercent?: unknown;
  readonly thresholdPercent?: unknown;
  readonly reportPath?: unknown;
};

const isFlowNodeRolloverNotification = (
  event: unknown
): event is FlowNodeRolloverNotification =>
  isRecord(event) &&
  event.kind === "flow_node_rollover" &&
  typeof event.phase === "string";

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

  if (isFlowNodeRolloverNotification(payload.event)) {
    const phase = payload.event.phase;
    const nextConnectionState =
      phase === "start" ||
      phase === "create_report_sent" ||
      phase === "waiting_for_report" ||
      phase === "report_ready"
        ? "blocked"
        : "idle";

    const remainingPercent = readNumber(payload.event.remainingPercent);
    const thresholdPercent = readNumber(payload.event.thresholdPercent);
    const reportPath = readString(payload.event.reportPath);

    return {
      ...snapshots,
      [payload.sessionId]: {
        ...snapshot,
        status: {
          ...snapshot.status,
          connectionState: nextConnectionState,
          rollover: {
            phase,
            ...(remainingPercent === null ? {} : { remainingPercent }),
            ...(thresholdPercent === null ? {} : { thresholdPercent }),
            ...(reportPath === null ? {} : { reportPath }),
            updatedAt: Date.now(),
          },
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
        connectionState: snapshot.status.connectionState,
        updatedAt: Date.now(),
      },
    },
  };
};
