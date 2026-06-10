import type { SessionRecord } from "../../../../types/session";
import type { SessionSnapshots } from "../../../ui/src/session/helpers";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

type TurnStateEvent = {
  readonly providerSessionId: string | null;
  readonly state: "idle" | "running";
};

const readTurnState = (event: unknown): TurnStateEvent | null => {
  if (!isRecord(event) || event.type !== "stream_event") {
    return null;
  }
  if (!isRecord(event.data) || event.data.kind !== "turn_state") {
    return null;
  }
  const state = event.data.state;
  if (state !== "idle" && state !== "running") {
    return null;
  }
  const providerSessionId =
    typeof event.data.providerSessionId === "string" &&
    event.data.providerSessionId.trim().length > 0
      ? event.data.providerSessionId.trim()
      : null;
  return { providerSessionId, state };
};

interface ManagedInputGate {
  readonly active: boolean;
  readonly force: boolean;
  readonly providerSessionId?: string | null;
  readonly reason?: string;
  readonly sessionIds: readonly string[];
}

const MANAGED_INPUT_GATE_UNLOCK_REASONS = new Set([
  "managed_core_gated",
  "diagram_modules_sequence",
  "managed_workflow_core_agent_turn",
] as const);

// Core is authoritative for managed gate state: an `active: false` event must
// release every managed lock, including reasons added after this client build.
// Only non-managed locks (e.g. bootstrap continuity) stay protected.
const isManagedGateLockReason = (reason: string | undefined): boolean =>
  reason === undefined ||
  reason.startsWith("managed") ||
  MANAGED_INPUT_GATE_UNLOCK_REASONS.has(reason as never);

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
    force: event.data.force === true,
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
    if (
      !(gate.active || gate.force) &&
      !isManagedGateLockReason(currentReason)
    ) {
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

export const shouldRefreshDialogHistoryForStream = (options: {
  readonly currentSession: Pick<SessionRecord, "binding" | "id"> | null;
  readonly event: unknown;
  readonly sessionId: string;
}): boolean => {
  const turnState = readTurnState(options.event);
  if (!options.currentSession || !turnState) {
    return false;
  }
  if (options.sessionId === options.currentSession.id) {
    return true;
  }
  return Boolean(
    turnState.providerSessionId &&
      turnState.providerSessionId ===
        options.currentSession.binding.providerSessionId
  );
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

  const targetIds = new Set<string>();
  if (snapshots[payload.sessionId]) {
    targetIds.add(payload.sessionId);
  }
  if (turnState.providerSessionId) {
    for (const [snapshotId, snapshot] of Object.entries(snapshots)) {
      if (snapshot.binding.providerSessionId === turnState.providerSessionId) {
        targetIds.add(snapshotId);
      }
    }
  }
  if (targetIds.size === 0) {
    return snapshots;
  }

  const now = Date.now();
  let changed = false;
  const nextSnapshots: SessionSnapshots = { ...snapshots };
  for (const targetId of targetIds) {
    const snapshot = nextSnapshots[targetId];
    if (!snapshot) {
      continue;
    }
    const currentLock = snapshot.status.continuityLock;
    const runningTurnLock =
      currentLock?.active === true && currentLock.reason === undefined;
    const continuityLock =
      turnState.state === "running"
        ? {
            ...(currentLock ?? {
              active: false,
              updatedAt: now,
            }),
            active: true,
            updatedAt: now,
          }
        : runningTurnLock
          ? {
              ...currentLock,
              active: false,
              updatedAt: now,
            }
          : currentLock;
    const nextConnectionState =
      turnState.state === "running"
        ? "running"
        : continuityLock?.active
          ? "blocked"
          : "idle";

    if (
      snapshot.status.connectionState === nextConnectionState &&
      snapshot.status.continuityLock === continuityLock
    ) {
      continue;
    }
    changed = true;
    nextSnapshots[targetId] = {
      ...snapshot,
      status: {
        ...snapshot.status,
        connectionState: nextConnectionState,
        ...(continuityLock ? { continuityLock } : {}),
        updatedAt: now,
      },
    };
  }

  return changed ? nextSnapshots : snapshots;
};
