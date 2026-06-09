import type { SessionSnapshots } from "../../../ui/src/session/helpers";

export const applyDialogManagedReviewPendingLock = (
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
