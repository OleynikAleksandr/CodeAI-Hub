import type { SessionSnapshots } from "../../../ui/src/session/helpers";

const applyDialogManagedReviewPendingLock = (
  snapshots: SessionSnapshots,
  sessionId: string,
  now = Date.now()
): SessionSnapshots => {
  const snapshot = snapshots[sessionId];
  if (!snapshot) {
    return snapshots;
  }
  return {
    ...snapshots,
    [sessionId]: {
      ...snapshot,
      status: {
        ...snapshot.status,
        connectionState:
          snapshot.status.connectionState === "running" ? "running" : "blocked",
        continuityLock: {
          active: true,
          reason: "managed_core_gated",
          updatedAt: now,
        },
        updatedAt: now,
      },
    },
  };
};

const MANAGED_REVIEW_PENDING_LOCK_TTL_MS = 60_000;

// Releases the optimistic local review lock when no Core gate event has
// touched it within the TTL, so a lost ack can never freeze the input forever.
const releaseExpiredDialogManagedReviewPendingLock = (
  snapshots: SessionSnapshots,
  sessionId: string,
  lockTimestamp: number,
  now = Date.now()
): SessionSnapshots => {
  const snapshot = snapshots[sessionId];
  const lock = snapshot?.status.continuityLock;
  if (
    !(snapshot && lock?.active) ||
    lock.reason !== "managed_core_gated" ||
    lock.updatedAt !== lockTimestamp
  ) {
    return snapshots;
  }
  return {
    ...snapshots,
    [sessionId]: {
      ...snapshot,
      status: {
        ...snapshot.status,
        connectionState:
          snapshot.status.connectionState === "blocked"
            ? "idle"
            : snapshot.status.connectionState,
        continuityLock: { ...lock, active: false, updatedAt: now },
        updatedAt: now,
      },
    },
  };
};

export const scheduleDialogManagedReviewPendingLock = (
  setSnapshots: (
    updater: (previous: SessionSnapshots) => SessionSnapshots
  ) => void,
  sessionId: string
): void => {
  const lockTimestamp = Date.now();
  setSnapshots((previous) =>
    applyDialogManagedReviewPendingLock(previous, sessionId, lockTimestamp)
  );
  window.setTimeout(() => {
    setSnapshots((previous) =>
      releaseExpiredDialogManagedReviewPendingLock(
        previous,
        sessionId,
        lockTimestamp
      )
    );
  }, MANAGED_REVIEW_PENDING_LOCK_TTL_MS);
};
