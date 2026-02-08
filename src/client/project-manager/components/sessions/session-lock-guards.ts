import type { WorkspaceSnapshotPushPayload } from "../../core-stream-message-types";

export const resolveContinuityLockActive = (
  session: WorkspaceSnapshotPushPayload["snapshot"]["sessions"][string]
): boolean =>
  session.continuityLockActive ||
  session.continuityLockTransition?.awaitingBootstrapTurn === true;

export const resolveContinuityLockReason = (
  session: WorkspaceSnapshotPushPayload["snapshot"]["sessions"][string]
): string | undefined =>
  session.continuityLockReason ??
  session.terminalLockReason ??
  session.continuityLockTransition?.reason;

export const isRolloverPendingAfterTerminalTurn = (
  session: WorkspaceSnapshotPushPayload["snapshot"]["sessions"][string],
  lockReason: string | undefined
): boolean =>
  session.resumeMode === "resume_via_rollover" &&
  session.finalTurnCompleted === true &&
  lockReason !== "resume_ready";
