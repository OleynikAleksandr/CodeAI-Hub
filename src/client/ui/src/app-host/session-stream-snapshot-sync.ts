import type { SessionSnapshot } from "../../../../types/session";
import type { SessionSnapshots } from "../session/helpers";
import {
  applyTokenUsageSyncFromStreamEvent,
  applyUsageLimitsSyncFromStreamEvent,
} from "./session-stream-usage-sync";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toNumberTimestamp = (value: unknown): number => {
  const parsed = typeof value === "string" ? Date.parse(value) : Number.NaN;
  return Number.isNaN(parsed) ? Date.now() : parsed;
};

const applyFlowNodeRolloverNotificationToSnapshot = (
  snapshot: SessionSnapshot,
  event: Record<string, unknown>
): SessionSnapshot => {
  const updatedAt = toNumberTimestamp(event.timestamp);
  const phase = typeof event.phase === "string" ? event.phase : "unknown";
  const remainingPercent =
    typeof event.remainingPercent === "number" ? event.remainingPercent : null;
  const thresholdPercent =
    typeof event.thresholdPercent === "number" ? event.thresholdPercent : null;
  const reportPath =
    typeof event.reportPath === "string" ? event.reportPath : null;
  const error = typeof event.error === "string" ? event.error : null;

  return {
    ...snapshot,
    status: {
      ...snapshot.status,
      rollover: {
        phase,
        ...(remainingPercent !== null ? { remainingPercent } : {}),
        ...(thresholdPercent !== null ? { thresholdPercent } : {}),
        ...(reportPath ? { reportPath } : {}),
        ...(error ? { error } : {}),
        updatedAt,
      },
      updatedAt,
    },
  };
};

const applyTurnStateStreamDataToSnapshot = (
  snapshot: SessionSnapshot,
  data: Record<string, unknown>,
  updatedAt: number
): SessionSnapshot => {
  const state = data.state;
  if (state !== "idle" && state !== "running") {
    return snapshot;
  }

  const nextConnectionState =
    snapshot.status.connectionState === "blocked" ? "blocked" : state;

  return {
    ...snapshot,
    status: {
      ...snapshot.status,
      connectionState: nextConnectionState,
      updatedAt,
    },
  };
};

const applyContinuityLockStreamDataToSnapshot = (
  snapshot: SessionSnapshot,
  data: Record<string, unknown>,
  updatedAt: number
): SessionSnapshot => {
  const active = data.state === "locked";
  const reason = typeof data.reason === "string" ? data.reason : null;
  const rolloverId =
    typeof data.rolloverId === "string" ? data.rolloverId : null;
  const sourceSessionId =
    typeof data.sourceSessionId === "string" ? data.sourceSessionId : null;
  const targetSessionId =
    typeof data.targetSessionId === "string" ? data.targetSessionId : null;

  return {
    ...snapshot,
    status: {
      ...snapshot.status,
      continuityLock: {
        active,
        ...(rolloverId ? { rolloverId } : {}),
        ...(sourceSessionId ? { sourceSessionId } : {}),
        ...(targetSessionId ? { targetSessionId } : {}),
        ...(reason ? { reason } : {}),
        updatedAt,
      },
      connectionState: active ? "blocked" : "idle",
      updatedAt,
    },
  };
};

const applyContinuityFailedStreamDataToSnapshot = (
  snapshot: SessionSnapshot,
  data: Record<string, unknown>,
  updatedAt: number
): SessionSnapshot => {
  const error = typeof data.error === "string" ? data.error : "Unknown error.";

  return {
    ...snapshot,
    status: {
      ...snapshot.status,
      rollover: {
        phase: "failed",
        error,
        updatedAt,
      },
      connectionState: "blocked",
      updatedAt,
    },
  };
};

const applyStreamEventEnvelopeToSnapshot = (
  snapshot: SessionSnapshot,
  event: Record<string, unknown>
): SessionSnapshot => {
  if (event.type !== "stream_event") {
    return snapshot;
  }

  const data = event.data;
  if (!isRecord(data) || typeof data.kind !== "string") {
    return snapshot;
  }

  const updatedAt = toNumberTimestamp(event.timestamp ?? data.timestamp);

  switch (data.kind) {
    case "turn_state":
      return applyTurnStateStreamDataToSnapshot(snapshot, data, updatedAt);
    case "continuity_lock":
      return applyContinuityLockStreamDataToSnapshot(snapshot, data, updatedAt);
    case "continuity_failed":
      return applyContinuityFailedStreamDataToSnapshot(
        snapshot,
        data,
        updatedAt
      );
    default:
      return snapshot;
  }
};

const applyStreamEventToSnapshot = (
  snapshot: SessionSnapshot,
  event: unknown
): SessionSnapshot => {
  if (!isRecord(event)) {
    return snapshot;
  }

  if (event.kind === "flow_node_rollover") {
    return applyFlowNodeRolloverNotificationToSnapshot(snapshot, event);
  }

  return applyStreamEventEnvelopeToSnapshot(snapshot, event);
};

export const applySessionStreamUpdateToSnapshots = (
  snapshots: SessionSnapshots,
  payload: { readonly sessionId: string; readonly event?: unknown }
): SessionSnapshots => {
  const baseSnapshot = snapshots[payload.sessionId];
  if (!baseSnapshot) {
    return snapshots;
  }

  const updatedAt = toNumberTimestamp(
    isRecord(payload.event) ? payload.event.timestamp : null
  );

  let nextSnapshots: SessionSnapshots = snapshots;
  let snapshot = baseSnapshot;

  const streamUpdated = applyStreamEventToSnapshot(snapshot, payload.event);
  if (streamUpdated !== snapshot) {
    snapshot = streamUpdated;
    nextSnapshots = { ...nextSnapshots, [payload.sessionId]: snapshot };
  }

  const tokenResult = applyTokenUsageSyncFromStreamEvent({
    snapshots: nextSnapshots,
    sessionId: payload.sessionId,
    snapshot,
    event: payload.event,
    updatedAt,
  });
  nextSnapshots = tokenResult.snapshots;
  snapshot = tokenResult.snapshot;

  const usageResult = applyUsageLimitsSyncFromStreamEvent({
    snapshots: nextSnapshots,
    sessionId: payload.sessionId,
    snapshot,
    event: payload.event,
    updatedAt,
  });
  nextSnapshots = usageResult.snapshots;

  return nextSnapshots;
};
