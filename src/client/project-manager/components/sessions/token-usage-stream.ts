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
type FlowNodeRolloverNotification = {
  readonly kind: "flow_node_rollover";
  readonly phase: string;
  readonly remainingPercent?: unknown;
  readonly thresholdPercent?: unknown;
  readonly reportPath?: unknown;
};
type TurnStateStreamEvent = { readonly data?: unknown };
type ContinuityLockStreamEvent = { readonly data?: unknown };

const isFlowNodeRolloverNotification = (
  event: unknown
): event is FlowNodeRolloverNotification =>
  isRecord(event) &&
  event.kind === "flow_node_rollover" &&
  typeof event.phase === "string";

const FLOW_NODE_ROLLOVER_PENDING_PHASES = new Set<string>([
  "start",
  "create_report_sent",
  "waiting_for_report",
  "report_ready",
  "new_session_created",
  "resume_sent",
]);
const TERMINAL_CONTINUITY_UNLOCK_REASONS = new Set<string>([
  "resume_ready",
  "resume_failed",
  "resume_timeout",
]);

const isFlowNodeRolloverPendingPhase = (phase: string): boolean =>
  FLOW_NODE_ROLLOVER_PENDING_PHASES.has(phase);

const isLegacyRolloverBlockedByPhase = (phase: string | undefined): boolean =>
  typeof phase === "string" && isFlowNodeRolloverPendingPhase(phase);

const isTerminalContinuityUnlockReason = (reason: string | null): boolean =>
  reason !== null && TERMINAL_CONTINUITY_UNLOCK_REASONS.has(reason);

const isLegacyRolloverBlocked = (
  snapshot: SessionSnapshots[string]
): boolean => {
  return isLegacyRolloverBlockedByPhase(snapshot.status.rollover?.phase);
};

const isContinuityLockActive = (
  snapshot: SessionSnapshots[string]
): boolean => snapshot.status.continuityLock?.active === true;

const extractTurnState = (event: unknown): "running" | "idle" | null => {
  if (!isRecord(event)) {
    return null;
  }
  const candidate = event as TurnStateStreamEvent;
  if (!isRecord(candidate.data) || candidate.data.kind !== "turn_state") {
    return null;
  }
  const raw = readString(candidate.data.state);
  if (raw === "running" || raw === "idle") {
    return raw;
  }
  return null;
};

const extractContinuityLock = (
  event: unknown
):
  | {
      readonly active: boolean;
      readonly rolloverId: string | null;
      readonly sourceSessionId: string | null;
      readonly targetSessionId: string | null;
      readonly reason: string | null;
    }
  | null => {
  if (!isRecord(event)) {
    return null;
  }
  const candidate = event as ContinuityLockStreamEvent;
  if (!isRecord(candidate.data) || candidate.data.kind !== "continuity_lock") {
    return null;
  }
  const rawState = readString(candidate.data.state);
  if (rawState !== "locked" && rawState !== "unlocked") {
    return null;
  }
  return {
    active: rawState === "locked",
    rolloverId: readString(candidate.data.rolloverId),
    sourceSessionId: readString(candidate.data.sourceSessionId),
    targetSessionId: readString(candidate.data.targetSessionId),
    reason: readString(candidate.data.reason),
  };
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
      isContinuityLockActive(snapshot) || isFlowNodeRolloverPendingPhase(phase)
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

  const continuityLock = extractContinuityLock(payload.event);
  if (continuityLock) {
    const now = Date.now();
    const previous = snapshot.status.continuityLock;
    const nextRollover =
      !continuityLock.active &&
      isTerminalContinuityUnlockReason(continuityLock.reason) &&
      snapshot.status.rollover
        ? {
            ...snapshot.status.rollover,
            phase: continuityLock.reason,
            updatedAt: now,
          }
        : snapshot.status.rollover;
    const nextContinuityLock = {
      ...(previous ?? {}),
      active: continuityLock.active,
      ...(continuityLock.rolloverId === null
        ? {}
        : { rolloverId: continuityLock.rolloverId }),
      ...(continuityLock.sourceSessionId === null
        ? {}
        : { sourceSessionId: continuityLock.sourceSessionId }),
      ...(continuityLock.targetSessionId === null
        ? {}
        : { targetSessionId: continuityLock.targetSessionId }),
      ...(continuityLock.reason === null ? {} : { reason: continuityLock.reason }),
      updatedAt: now,
    };

    const nextConnectionState = continuityLock.active
      ? "blocked"
      : snapshot.status.connectionState === "blocked" &&
          !isLegacyRolloverBlockedByPhase(nextRollover?.phase)
        ? "idle"
        : snapshot.status.connectionState;

    return {
      ...snapshots,
      [payload.sessionId]: {
        ...snapshot,
        status: {
          ...snapshot.status,
          continuityLock: nextContinuityLock,
          ...(nextRollover ? { rollover: nextRollover } : {}),
          connectionState: nextConnectionState,
          updatedAt: now,
        },
      },
    };
  }

  const turnState = extractTurnState(payload.event);
  if (turnState) {
    const current = snapshot.status.connectionState;
    const nextConnectionState =
      isContinuityLockActive(snapshot) || isLegacyRolloverBlocked(snapshot)
        ? "blocked"
        : turnState;
    if (nextConnectionState === current) {
      return snapshots;
    }
    return {
      ...snapshots,
      [payload.sessionId]: {
        ...snapshot,
        status: {
          ...snapshot.status,
          connectionState: nextConnectionState,
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
