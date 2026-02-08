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
    connectionState: "running",
    continuityLock: {
      active: true,
      updatedAt: Date.now(),
    },
    rollover: {
      phase: "resume_sent",
      updatedAt: Date.now(),
    },
    updatedAt: Date.now(),
  },
});

test("updateSnapshotsWithTokenUsage updates token usage but keeps lock state from snapshot", () => {
  const snapshots = { s1: createSnapshot() };

  const next = updateSnapshotsWithTokenUsage(snapshots, {
    sessionId: "s1",
    event: {
      type: "stream_event",
      data: {
        kind: "token_usage",
        used: 42,
        limit: 100,
      },
    },
  });

  assert.equal(next.s1.status.tokenUsage.used, 42);
  assert.equal(next.s1.status.tokenUsage.limit, 100);
  assert.equal(next.s1.status.connectionState, "running");
  assert.equal(next.s1.status.continuityLock?.active, true);
  assert.equal(next.s1.status.rollover?.phase, "resume_sent");
});

test("updateSnapshotsWithTokenUsage ignores turn_state stream events", () => {
  const snapshots = { s1: createSnapshot() };

  const next = updateSnapshotsWithTokenUsage(snapshots, {
    sessionId: "s1",
    event: {
      type: "stream_event",
      data: {
        kind: "turn_state",
        state: "idle",
      },
    },
  });

  assert.equal(next, snapshots);
});

test("updateSnapshotsWithTokenUsage ignores continuity_lock stream events", () => {
  const snapshots = { s1: createSnapshot() };

  const next = updateSnapshotsWithTokenUsage(snapshots, {
    sessionId: "s1",
    event: {
      type: "stream_event",
      data: {
        kind: "continuity_lock",
        state: "unlocked",
        reason: "resume_ready",
      },
    },
  });

  assert.equal(next, snapshots);
});
