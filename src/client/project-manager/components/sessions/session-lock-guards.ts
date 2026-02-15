import type { WorkspaceSnapshotPushPayload } from "../../core-stream-message-types";

export const resolveContinuityLockActive = (
  session: WorkspaceSnapshotPushPayload["snapshot"]["sessions"][string]
): boolean =>
  session.continuityLockActive ||
  session.continuityLockReason === "context_check_pending" ||
  session.continuityLockTransition?.reason === "context_check_pending" ||
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
  lockReason !== "resume_ready" &&
  lockReason !== "resume_failed" &&
  lockReason !== "resume_timeout";

export const isContextDecisionPending = (
  session: WorkspaceSnapshotPushPayload["snapshot"]["sessions"][string],
  lockReason: string | undefined
): boolean =>
  session.finalTurnCompleted === true && lockReason === "context_check_pending";
