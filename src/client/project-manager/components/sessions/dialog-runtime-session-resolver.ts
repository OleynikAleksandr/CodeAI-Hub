import type { WorkspaceSnapshotPushPayload } from "../../core-stream-message-types";

export type RuntimeSessionResolution = {
  readonly runtimeSessionId: string;
  readonly hasRuntimeSession: boolean;
};

export const resolveRuntimeSessionFromWorkspaceSnapshot = (options: {
  readonly payload: WorkspaceSnapshotPushPayload | null;
  readonly preferredSessionId: string;
  readonly dialogId: string;
  readonly providerSessionId: string | null;
}): RuntimeSessionResolution => {
  if (!options.payload) {
    return { runtimeSessionId: options.preferredSessionId, hasRuntimeSession: false };
  }
  const runtimeSessions = options.payload.snapshot.sessions;
  if (runtimeSessions[options.preferredSessionId]) {
    return { runtimeSessionId: options.preferredSessionId, hasRuntimeSession: true };
  }
  if (runtimeSessions[options.dialogId]) {
    return { runtimeSessionId: options.dialogId, hasRuntimeSession: true };
  }
  if (!options.providerSessionId) {
    return { runtimeSessionId: options.preferredSessionId, hasRuntimeSession: false };
  }
  const fallback = Object.entries(runtimeSessions).find(
    ([, session]) => session.providerSessionId === options.providerSessionId
  );
  return fallback
    ? { runtimeSessionId: fallback[0], hasRuntimeSession: true }
    : { runtimeSessionId: options.preferredSessionId, hasRuntimeSession: false };
};
