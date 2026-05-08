import assert from "node:assert/strict";
import test from "node:test";
import type { SessionSnapshot } from "../../../../types/session";
import { updateSnapshotsWithTurnState } from "./turn-state-stream";

const createSnapshot = (
  connectionState: "idle" | "running" | "blocked" = "idle"
): SessionSnapshot => ({
  messages: [],
  todos: [],
  draft: "",
  binding: {
    providerSessionId: null,
    status: "ready",
  },
  status: {
    providerSummary: "Claude",
    tokenUsage: { used: 0, limit: 200_000 },
    connectionState,
    continuityLock: {
      active: false,
      updatedAt: Date.now(),
    },
    updatedAt: Date.now(),
  },
});

test("updateSnapshotsWithTurnState locks input immediately on running stream event", () => {
  const snapshots = { s1: createSnapshot("idle") };

  const next = updateSnapshotsWithTurnState(snapshots, {
    sessionId: "s1",
    event: {
      type: "stream_event",
      data: {
        kind: "turn_state",
        state: "running",
      },
    },
  });

  assert.equal(next.s1.status.connectionState, "running");
  assert.equal(next.s1.status.continuityLock?.active, true);
});

test("updateSnapshotsWithTurnState unlocks idle turn only when no continuity lock is active", () => {
  const locked = createSnapshot("running");
  const snapshots = {
    s1: {
      ...locked,
      status: {
        ...locked.status,
        continuityLock: {
          active: true,
          reason: "resume_bootstrap",
          updatedAt: Date.now(),
        },
      },
    },
  };

  const next = updateSnapshotsWithTurnState(snapshots, {
    sessionId: "s1",
    event: {
      type: "stream_event",
      data: {
        kind: "turn_state",
        state: "idle",
      },
    },
  });

  assert.equal(next.s1.status.connectionState, "blocked");
  assert.equal(next.s1.status.continuityLock?.active, true);
});

test("updateSnapshotsWithTurnState ignores unrelated stream events", () => {
  const snapshots = { s1: createSnapshot("idle") };

  const next = updateSnapshotsWithTurnState(snapshots, {
    sessionId: "s1",
    event: {
      type: "stream_event",
      data: {
        kind: "token_usage",
        used: 100,
        limit: 200,
      },
    },
  });

  assert.equal(next, snapshots);
});
