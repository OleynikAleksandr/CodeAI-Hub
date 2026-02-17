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

test("updateSnapshotsWithTokenUsage records flow_node_rollover events", () => {
  const snapshots = { s1: createSnapshot() };

  const next = updateSnapshotsWithTokenUsage(snapshots, {
    sessionId: "s1",
    event: {
      kind: "flow_node_rollover",
      phase: "failed",
      reportPath: "/tmp/report.md",
      error: "Timed out waiting for continuity report: /tmp/report.md",
      timestamp: new Date().toISOString(),
    },
  });

  assert.equal(next.s1.status.rollover?.phase, "failed");
  assert.equal(next.s1.status.rollover?.reportPath, "/tmp/report.md");
  assert.equal(
    next.s1.status.rollover?.error,
    "Timed out waiting for continuity report: /tmp/report.md"
  );
});

test("updateSnapshotsWithTokenUsage records continuity_failed stream events", () => {
  const snapshots = { s1: createSnapshot() };

  const next = updateSnapshotsWithTokenUsage(snapshots, {
    sessionId: "s1",
    event: {
      type: "stream_event",
      data: {
        kind: "continuity_failed",
        reason: "ack_timeout",
        error: "Timed out waiting for continuity create-report ack (requestId=abc)",
      },
      timestamp: new Date().toISOString(),
    },
  });

  assert.equal(next.s1.status.rollover?.phase, "failed");
  assert.equal(
    next.s1.status.rollover?.error,
    "ack_timeout: Timed out waiting for continuity create-report ack (requestId=abc)"
  );
});

test("updateSnapshotsWithTokenUsage supports nested tokenUsage payload and keeps lock fields untouched", () => {
  const snapshots = { s1: createSnapshot() };

  const next = updateSnapshotsWithTokenUsage(snapshots, {
    sessionId: "s1",
    event: {
      type: "stream_event",
      data: {
        tokenUsage: {
          used: 128,
          limit: 256,
        },
      },
    },
  });

  assert.equal(next.s1.status.tokenUsage.used, 128);
  assert.equal(next.s1.status.tokenUsage.limit, 256);
  assert.equal(next.s1.status.connectionState, "running");
  assert.equal(next.s1.status.continuityLock?.active, true);
  assert.equal(next.s1.status.rollover?.phase, "resume_sent");
});

test("updateSnapshotsWithTokenUsage falls back to providerSessionId when sessionId snapshot is missing", () => {
  const snapshots = {
    root: {
      ...createSnapshot(),
      binding: {
        providerSessionId: "thread-123",
        status: "ready" as const,
      },
    },
  };

  const next = updateSnapshotsWithTokenUsage(snapshots, {
    sessionId: "latest",
    event: {
      type: "stream_event",
      threadId: "thread-123",
      data: {
        kind: "token_usage",
        used: 256,
        limit: 512,
      },
    },
  });

  assert.equal(next.root.status.tokenUsage.used, 256);
  assert.equal(next.root.status.tokenUsage.limit, 512);
});
