import type { WorkspaceSnapshotPushPayload } from "../../core-stream-message-types";

export const resolveRuntimeSessionIdFromWorkspaceSnapshot = (options: {
  readonly payload: WorkspaceSnapshotPushPayload | null;
  readonly preferredSessionId: string;
  readonly dialogId: string;
  readonly providerSessionId: string | null;
}): string => {
  if (!options.payload) {
    return options.preferredSessionId;
  }
  const runtimeSessions = options.payload.snapshot.sessions;
  if (runtimeSessions[options.preferredSessionId]) {
    return options.preferredSessionId;
  }
  if (runtimeSessions[options.dialogId]) {
    return options.dialogId;
  }
  if (!options.providerSessionId) {
    return options.preferredSessionId;
  }
  const fallback = Object.entries(runtimeSessions).find(
    ([, session]) => session.providerSessionId === options.providerSessionId
  );
  return fallback?.[0] ?? options.preferredSessionId;
};
