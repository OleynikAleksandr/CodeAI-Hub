import assert from "node:assert/strict";
import test from "node:test";
import type { SessionSnapshot } from "../../../../types/session";
import { updateSnapshotsWithTurnState } from "./turn-state-stream";

const createSnapshot = (
  connectionState: "idle" | "running" | "blocked" = "idle",
  providerSessionId: string | null = null
): SessionSnapshot => ({
  messages: [],
  todos: [],
  draft: "",
  binding: {
    providerSessionId,
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

test("managed input gate locks visible dialog projection by provider session id", () => {
  const snapshots = {
    "dialog-visible": createSnapshot("idle", "provider-session-1"),
  };

  const next = updateSnapshotsWithTurnState(snapshots, {
    sessionId: "runtime-session-1",
    event: {
      type: "stream_event",
      data: {
        kind: "managed_input_gate",
        active: true,
        reason: "managed_core_gated",
        providerSessionId: "provider-session-1",
        sessionIds: ["runtime-session-1", "root-session-1"],
      },
    },
  });

  assert.equal(next["dialog-visible"].status.connectionState, "blocked");
  assert.equal(next["dialog-visible"].status.continuityLock?.active, true);
  assert.equal(
    next["dialog-visible"].status.continuityLock?.reason,
    "managed_core_gated"
  );
});

test("managed input gate unlocks only its own managed lock", () => {
  const locked = createSnapshot("blocked", "provider-session-1");
  const snapshots = {
    "dialog-visible": {
      ...locked,
      status: {
        ...locked.status,
        continuityLock: {
          active: true,
          reason: "managed_core_gated",
          updatedAt: Date.now(),
        },
      },
    },
    "resume-visible": {
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
    sessionId: "runtime-session-1",
    event: {
      type: "stream_event",
      data: {
        kind: "managed_input_gate",
        active: false,
        providerSessionId: "provider-session-1",
      },
    },
  });

  assert.equal(next["dialog-visible"].status.connectionState, "idle");
  assert.equal(next["dialog-visible"].status.continuityLock?.active, false);
  assert.equal(next["resume-visible"].status.connectionState, "blocked");
  assert.equal(next["resume-visible"].status.continuityLock?.active, true);
});

test("managed input gate forced unlock releases a stale managed lock reason", () => {
  const locked = createSnapshot("blocked", "provider-session-1");
  const snapshots = {
    "dialog-visible": {
      ...locked,
      status: {
        ...locked.status,
        continuityLock: {
          active: true,
          reason: "managed_workflow_core_agent_turn",
          updatedAt: Date.now(),
        },
      },
    },
  };

  const next = updateSnapshotsWithTurnState(snapshots, {
    sessionId: "runtime-session-1",
    event: {
      type: "stream_event",
      data: {
        kind: "managed_input_gate",
        active: false,
        force: true,
        providerSessionId: "provider-session-1",
      },
    },
  });

  assert.equal(next["dialog-visible"].status.connectionState, "idle");
  assert.equal(next["dialog-visible"].status.continuityLock?.active, false);
});
