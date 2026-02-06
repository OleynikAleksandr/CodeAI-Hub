import assert from "node:assert/strict";
import test from "node:test";
import type { SessionSnapshot } from "../../../../types/session";
import { updateSnapshotsWithTokenUsage } from "./token-usage-stream";

const createSnapshot = (): SessionSnapshot => ({
  messages: [],
  todos: [],
  draft: "",
  binding: {
    providerSessionId: null,
    status: "pending",
  },
  status: {
    providerSummary: "Claude",
    tokenUsage: { used: 0, limit: 200_000 },
    connectionState: "idle",
    continuityLock: {
      active: false,
      updatedAt: Date.now(),
    },
    updatedAt: Date.now(),
  },
});

test("updateSnapshotsWithTokenUsage activates continuity lock and blocks input", () => {
  const next = updateSnapshotsWithTokenUsage(
    { s1: createSnapshot() },
    {
      sessionId: "s1",
      event: {
        type: "stream_event",
        data: {
          kind: "continuity_lock",
          state: "locked",
          rolloverId: "rollover-1",
          sourceSessionId: "s1",
          reason: "resume_bootstrap",
        },
      },
    }
  );

  assert.equal(next.s1.status.continuityLock?.active, true);
  assert.equal(next.s1.status.connectionState, "blocked");
});

test("updateSnapshotsWithTokenUsage keeps blocked state while continuity lock is active", () => {
  const snapshot = createSnapshot();
  const lockedSnapshot: SessionSnapshot = {
    ...snapshot,
    status: {
      ...snapshot.status,
      connectionState: "blocked",
      continuityLock: {
        active: true,
        rolloverId: "rollover-1",
        sourceSessionId: "s1",
        reason: "resume_bootstrap",
        updatedAt: Date.now(),
      },
      updatedAt: Date.now(),
    },
  };

  const next = updateSnapshotsWithTokenUsage(
    { s1: lockedSnapshot },
    {
      sessionId: "s1",
      event: {
        kind: "flow_node_rollover",
        phase: "resume_sent",
      },
    }
  );

  assert.equal(next.s1.status.connectionState, "blocked");
  assert.equal(next.s1.status.continuityLock?.active, true);
});

test("updateSnapshotsWithTokenUsage unlocks continuity lock and restores idle state", () => {
  const snapshot = createSnapshot();
  const lockedSnapshot: SessionSnapshot = {
    ...snapshot,
    status: {
      ...snapshot.status,
      connectionState: "blocked",
      continuityLock: {
        active: true,
        rolloverId: "rollover-1",
        sourceSessionId: "s1",
        reason: "resume_bootstrap",
        updatedAt: Date.now(),
      },
      updatedAt: Date.now(),
    },
  };

  const next = updateSnapshotsWithTokenUsage(
    { s1: lockedSnapshot },
    {
      sessionId: "s1",
      event: {
        type: "stream_event",
        data: {
          kind: "continuity_lock",
          state: "unlocked",
          rolloverId: "rollover-1",
          sourceSessionId: "s1",
          reason: "resume_ready",
        },
      },
    }
  );

  assert.equal(next.s1.status.continuityLock?.active, false);
  assert.equal(next.s1.status.connectionState, "idle");
});
