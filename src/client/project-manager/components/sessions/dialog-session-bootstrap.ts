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

const RUNTIME_RESTORE_IN_FLIGHT_TTL_MS = 30_000;

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

export const createDialogBootstrapSnapshots = (options: {
  readonly previous: SessionSnapshots;
  readonly nextSession: SessionRecord;
  readonly providerId: ProviderStackId | null;
  readonly settings: Settings | null;
  readonly latestSnapshot: WorkspaceSnapshotPushPayload | null;
}): SessionSnapshots => {
  if (options.previous[options.nextSession.id]) {
    return options.previous;
  }
  const labelsForSnapshot = buildProviderLabels(options.providerId);
  const base = createInitialSnapshot(
    options.nextSession,
    labelsForSnapshot,
    options.settings
  );
  let next: SessionSnapshots = {
    ...options.previous,
    [options.nextSession.id]: base,
  };
  if (
    options.latestSnapshot &&
    options.latestSnapshot.workspaceRoot === options.nextSession.workspacePath
  ) {
    next = applyWorkspaceSnapshotToSnapshots(next, options.latestSnapshot);
  }
  return next;
};
