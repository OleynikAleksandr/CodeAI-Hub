import assert from "node:assert/strict";
import test from "node:test";
import type { SessionSnapshot } from "../../../../types/session";
import {
  updateSnapshotsWithUsageLimits,
} from "./usage-limits-stream";

const createSnapshot = (options?: {
  readonly providerSummary?: string;
  readonly updatedAt?: number;
  readonly usageLimits?: SessionSnapshot["status"]["usageLimits"];
}): SessionSnapshot => ({
  messages: [],
  todos: [],
  draft: "",
  binding: {
    providerSessionId: null,
    status: "pending",
  },
  status: {
    providerSummary: options?.providerSummary ?? "Claude",
    tokenUsage: { used: 0, limit: 200_000 },
    connectionState: "running",
    continuityLock: {
      active: true,
      updatedAt: options?.updatedAt ?? Date.now(),
    },
    usageLimits: options?.usageLimits,
    updatedAt: options?.updatedAt ?? Date.now(),
  },
});

test("updateSnapshotsWithUsageLimits applies direct usageLimits payload", () => {
  const snapshots = { s1: createSnapshot() };

  const next = updateSnapshotsWithUsageLimits(snapshots, {
    sessionId: "s1",
    event: {
      usageLimits: {
        currentSession: {
          percentUsed: 24,
          resetsAt: "2026-02-13T10:00:00.000Z",
        },
        currentWeekAllModels: {
          percentUsed: 67,
          resetsAt: "2026-02-17T10:00:00.000Z",
        },
        currentWeekSonnetOnly: null,
      },
    },
  });

  assert.equal(next.s1.status.usageLimits?.currentSession?.percentUsed, 24);
  assert.equal(
    next.s1.status.usageLimits?.currentWeekAllModels?.percentUsed,
    67
  );
  assert.equal(next.s1.status.usageLimits?.currentWeekSonnetOnly, null);
  assert.equal(next.s1.status.connectionState, "running");
  assert.equal(next.s1.status.continuityLock?.active, true);
});

test("updateSnapshotsWithUsageLimits supports stream_event data.kind=usage_limits payload", () => {
  const snapshots = { s1: createSnapshot() };

  const next = updateSnapshotsWithUsageLimits(snapshots, {
    sessionId: "s1",
    event: {
      data: {
        kind: "usage_limits",
        usageLimits: {
          currentSession: {
            percentUsed: "101.4",
            resetsAt: "2026-02-13 10:00 (UTC)",
          },
          currentWeekAllModels: {
            percentUsed: "-5",
            resetsAt: null,
          },
          currentWeekSonnetOnly: {
            percentUsed: 44,
            resetsAt: "ignored-value",
          },
        },
      },
    },
  });

  assert.equal(next.s1.status.usageLimits?.currentSession?.percentUsed, 100);
  assert.equal(next.s1.status.usageLimits?.currentWeekAllModels?.percentUsed, 0);
  assert.equal(next.s1.status.usageLimits?.currentWeekSonnetOnly?.percentUsed, 44);
});

test("updateSnapshotsWithUsageLimits ignores malformed payloads", () => {
  const snapshots = { s1: createSnapshot() };

  const next = updateSnapshotsWithUsageLimits(snapshots, {
    sessionId: "s1",
    event: {
      data: {
        kind: "usage_limits",
        usageLimits: {
          currentSession: {
            percentUsed: "not-a-number",
          },
        },
      },
    },
  });

  assert.equal(next, snapshots);
});

test("updateSnapshotsWithUsageLimits propagates latest limits to all sessions of same provider", () => {
  const snapshots = {
    s1: createSnapshot({ providerSummary: "Claude" }),
    s2: createSnapshot({ providerSummary: "Claude" }),
    s3: createSnapshot({ providerSummary: "Codex" }),
  };

  const next = updateSnapshotsWithUsageLimits(snapshots, {
    sessionId: "s1",
    event: {
      usageLimits: {
        currentSession: {
          percentUsed: 9,
          resetsAt: "2026-02-12T17:00:00.000Z",
        },
        currentWeekAllModels: {
          percentUsed: 12,
          resetsAt: "2026-02-15T07:00:00.000Z",
        },
      },
    },
  });

  assert.equal(next.s1.status.usageLimits?.currentSession?.percentUsed, 9);
  assert.equal(next.s2.status.usageLimits?.currentSession?.percentUsed, 9);
  assert.equal(next.s3.status.usageLimits, undefined);
});

