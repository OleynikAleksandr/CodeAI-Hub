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

interface ManagedInputGate {
  readonly active: boolean;
  readonly providerSessionId?: string | null;
  readonly reason?: string;
  readonly sessionIds: readonly string[];
}

const readManagedInputGate = (event: unknown): ManagedInputGate | null => {
  if (!isRecord(event) || event.type !== "stream_event") {
    return null;
  }
  if (!isRecord(event.data) || event.data.kind !== "managed_input_gate") {
    return null;
  }
  const sessionIds = Array.isArray(event.data.sessionIds)
    ? event.data.sessionIds.filter((value): value is string => typeof value === "string")
    : [];
  const providerSessionId =
    typeof event.data.providerSessionId === "string"
      ? event.data.providerSessionId
      : null;
  const reason =
    typeof event.data.reason === "string" ? event.data.reason : undefined;
  return {
    active: event.data.active === true,
    providerSessionId,
    reason,
    sessionIds,
  };
};

const resolveManagedGateTargets = (
  snapshots: SessionSnapshots,
  payload: { readonly event: unknown; readonly sessionId: string }
): readonly string[] => {
  const gate = readManagedInputGate(payload.event);
  if (!gate) {
    return [];
  }
  const targets = new Set([payload.sessionId, ...gate.sessionIds]);
  if (gate.providerSessionId) {
    for (const [snapshotId, snapshot] of Object.entries(snapshots)) {
      if (snapshot.binding.providerSessionId === gate.providerSessionId) {
        targets.add(snapshotId);
      }
    }
  }
  return [...targets].filter((target) => Boolean(snapshots[target]));
};

const updateSnapshotsWithManagedInputGate = (
  snapshots: SessionSnapshots,
  payload: { readonly event: unknown; readonly sessionId: string }
): SessionSnapshots => {
  const gate = readManagedInputGate(payload.event);
  if (!gate) {
    return snapshots;
  }
  const targets = resolveManagedGateTargets(snapshots, payload);
  if (targets.length === 0) {
    return snapshots;
  }
  const now = Date.now();
  let changed = false;
  const nextSnapshots: SessionSnapshots = { ...snapshots };
  for (const target of targets) {
    const snapshot = nextSnapshots[target];
    if (!snapshot) {
      continue;
    }
    const currentReason = snapshot.status.continuityLock?.reason;
    if (!gate.active && currentReason !== "managed_core_gated") {
      continue;
    }
    const nextConnectionState = gate.active
      ? snapshot.status.connectionState === "running"
        ? "running"
        : "blocked"
      : snapshot.status.connectionState === "blocked"
        ? "idle"
        : snapshot.status.connectionState;
    nextSnapshots[target] = {
      ...snapshot,
      status: {
        ...snapshot.status,
        connectionState: nextConnectionState,
        continuityLock: {
          ...(snapshot.status.continuityLock ?? { active: false, updatedAt: now }),
          active: gate.active,
          ...(gate.active ? { reason: gate.reason ?? "managed_core_gated" } : {}),
          updatedAt: now,
        },
        updatedAt: now,
      },
    };
    changed = true;
  }
  return changed ? nextSnapshots : snapshots;
};

export const updateSnapshotsWithTurnState = (
  snapshots: SessionSnapshots,
  payload: { readonly sessionId: string; readonly event: unknown }
): SessionSnapshots => {
  const managedGateSnapshots = updateSnapshotsWithManagedInputGate(
    snapshots,
    payload
  );
  if (managedGateSnapshots !== snapshots) {
    return managedGateSnapshots;
  }

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
