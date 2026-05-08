import type { SessionSnapshots } from "../../../ui/src/session/helpers";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const readTurnState = (event: unknown): "idle" | "running" | null => {
  if (!isRecord(event) || event.type !== "stream_event") {
    return null;
  }
  if (!isRecord(event.data) || event.data.kind !== "turn_state") {
    return null;
  }
  return event.data.state === "idle" || event.data.state === "running"
    ? event.data.state
    : null;
};

export const updateSnapshotsWithTurnState = (
  snapshots: SessionSnapshots,
  payload: { readonly sessionId: string; readonly event: unknown }
): SessionSnapshots => {
  const turnState = readTurnState(payload.event);
  if (!turnState) {
    return snapshots;
  }

  const snapshot = snapshots[payload.sessionId];
  if (!snapshot) {
    return snapshots;
  }

  const continuityLock =
    turnState === "running"
      ? {
          ...(snapshot.status.continuityLock ?? {
            active: false,
            updatedAt: Date.now(),
          }),
          active: true,
          updatedAt: Date.now(),
        }
      : snapshot.status.continuityLock;
  const nextConnectionState =
    turnState === "running"
      ? "running"
      : snapshot.status.continuityLock?.active
        ? "blocked"
        : "idle";

  if (
    snapshot.status.connectionState === nextConnectionState &&
    snapshot.status.continuityLock === continuityLock
  ) {
    return snapshots;
  }

  return {
    ...snapshots,
    [payload.sessionId]: {
      ...snapshot,
      status: {
        ...snapshot.status,
        connectionState: nextConnectionState,
        ...(continuityLock ? { continuityLock } : {}),
        updatedAt: Date.now(),
      },
    },
  };
};
