import type { SessionRecord } from "../../../../types/session";
import type { ProviderStackId } from "../../../../types/provider";
import type { WorkspaceSnapshotPushPayload } from "../../core-stream-message-types";
import type { Settings } from "../../../ui/src/components/settings/settings-state-model";
import {
  createInitialSnapshot,
  type SessionSnapshots,
} from "../../../ui/src/session/helpers";
import { buildProviderLabels } from "./project-manager-dialog-session-view-helpers";
import { applyWorkspaceSnapshotToSnapshots } from "./session-stream";
import { seedSnapshotWithCachedUsageLimits } from "./usage-limits-stream";

const RUNTIME_RESTORE_IN_FLIGHT_TTL_MS = 30_000;
const RUNTIME_HYDRATION_LOCK_REASON = "runtime_state_hydration";

const pruneExpiredRestoreRequests = (
  requests: Map<string, number>,
  now: number
): void => {
  for (const [key, startedAt] of requests) {
    if (now - startedAt > RUNTIME_RESTORE_IN_FLIGHT_TTL_MS) {
      requests.delete(key);
    }
  }
};

export const buildDialogRestoreRequestKey = (options: {
  readonly workspacePath: string;
  readonly dialogId: string;
  readonly providerSessionId: string | null;
}): string | null =>
  options.providerSessionId === null
    ? null
    : [
        options.workspacePath,
        options.dialogId,
        options.providerSessionId,
      ].join("|");

export const shouldCreateRuntimeRestore = (options: {
  readonly requests: Map<string, number>;
  readonly restoreKey: string | null;
  readonly hasRuntimeSession: boolean;
  readonly now: number;
}): boolean => {
  pruneExpiredRestoreRequests(options.requests, options.now);
  if (!options.restoreKey) {
    return false;
  }
  if (options.hasRuntimeSession) {
    options.requests.delete(options.restoreKey);
    return false;
  }
  if (options.requests.has(options.restoreKey)) {
    return false;
  }
  options.requests.set(options.restoreKey, options.now);
  return true;
};

const shouldApplyRuntimeHydrationLock = (session: SessionRecord): boolean =>
  session.binding.status === "pending" &&
  typeof session.binding.providerSessionId === "string";

const applyRuntimeHydrationLock = (
  snapshots: SessionSnapshots,
  session: SessionRecord
): SessionSnapshots => {
  const current = snapshots[session.id];
  if (!current) {
    return snapshots;
  }
  if (
    current.status.connectionState === "blocked" &&
    current.status.continuityLock?.active === true &&
    current.status.continuityLock.reason === RUNTIME_HYDRATION_LOCK_REASON
  ) {
    return snapshots;
  }
  const now = Date.now();
  return {
    ...snapshots,
    [session.id]: {
      ...current,
      binding: session.binding,
      status: {
        ...current.status,
        connectionState: "blocked",
        continuityLock: {
          active: true,
          reason: RUNTIME_HYDRATION_LOCK_REASON,
          updatedAt: now,
        },
        updatedAt: now,
      },
    },
  };
};

export const createDialogBootstrapSnapshots = (options: {
  readonly previous: SessionSnapshots;
  readonly nextSession: SessionRecord;
  readonly providerId: ProviderStackId | null;
  readonly settings: Settings | null;
  readonly latestSnapshot: WorkspaceSnapshotPushPayload | null;
}): SessionSnapshots => {
  const existing = options.previous[options.nextSession.id];
  let next: SessionSnapshots = options.previous;
  if (!existing) {
    const labelsForSnapshot = buildProviderLabels(options.providerId);
    const base = seedSnapshotWithCachedUsageLimits(
      createInitialSnapshot(
        options.nextSession,
        labelsForSnapshot,
        options.settings
      )
    );
    next = {
      ...options.previous,
      [options.nextSession.id]: base,
    };
  }
  if (
    options.latestSnapshot &&
    options.latestSnapshot.workspaceRoot === options.nextSession.workspacePath
  ) {
    next = applyWorkspaceSnapshotToSnapshots(next, options.latestSnapshot);
  }
  if (shouldApplyRuntimeHydrationLock(options.nextSession)) {
    next = applyRuntimeHydrationLock(next, options.nextSession);
  }
  return next;
};
