import assert from "node:assert/strict";
import test from "node:test";
import type { SessionSnapshot } from "../../../../types/session";
import {
  resetProviderUsageTelemetryCacheForTests,
  seedSnapshotWithCachedUsageLimits,
  updateSnapshotsWithUsageLimits,
} from "./usage-limits-stream";

const createSnapshot = (options?: {
  readonly providerScopeKey?: string;
  readonly providerSummary?: string;
  readonly tokenUsage?: SessionSnapshot["status"]["tokenUsage"];
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
    ...(options?.providerScopeKey
      ? { providerScopeKey: options.providerScopeKey }
      : {}),
    tokenUsage: options?.tokenUsage ?? { used: 0, limit: 200_000 },
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
  resetProviderUsageTelemetryCacheForTests();
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
  resetProviderUsageTelemetryCacheForTests();
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
  resetProviderUsageTelemetryCacheForTests();
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

test("updateSnapshotsWithUsageLimits normalizes same-provider sessions to a global scope key", () => {
  resetProviderUsageTelemetryCacheForTests();
  const snapshots = {
    s1: createSnapshot({
      providerSummary: "CodeAI-Hub codex 5.4",
      providerScopeKey: "codex:019d816e-legacy-a",
    }),
    s2: createSnapshot({
      providerSummary: "Codex",
      providerScopeKey: "codex:019d8253-legacy-b",
    }),
    s3: createSnapshot({
      providerSummary: "Claude",
      providerScopeKey: "claude:global",
    }),
  };

  const next = updateSnapshotsWithUsageLimits(snapshots, {
    sessionId: "s1",
    event: {
      providerScopeKey: "codex:019d816e-legacy-a",
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
  assert.equal(next.s1.status.providerScopeKey, "codex:global");
  assert.equal(next.s2.status.usageLimits?.currentSession?.percentUsed, 9);
  assert.equal(next.s2.status.providerScopeKey, "codex:global");
  assert.equal(next.s3.status.usageLimits, undefined);
  assert.equal(next.s3.status.providerScopeKey, "claude:global");
});

test("updateSnapshotsWithUsageLimits keeps cached usage snapshot stable for identical replayed payload", () => {
  resetProviderUsageTelemetryCacheForTests();
  const usageLimits = {
    currentSession: {
      percentUsed: 18,
      resetsAt: "2026-02-13T10:00:00.000Z",
    },
    currentWeekAllModels: {
      percentUsed: 52,
      resetsAt: "2026-02-17T10:00:00.000Z",
    },
    currentWeekSonnetOnly: null,
  } satisfies NonNullable<SessionSnapshot["status"]["usageLimits"]>;
  const snapshots = {
    s1: createSnapshot({
      providerSummary: "Codex",
      providerScopeKey: "codex:global",
      usageLimits,
    }),
  };

  const next = updateSnapshotsWithUsageLimits(snapshots, {
    sessionId: "s1",
    event: {
      providerScopeKey: "codex:session-123",
      usageLimits,
    },
  });

  assert.equal(next, snapshots);
});

test("updateSnapshotsWithUsageLimits keeps tokenUsage untouched when replaying cached usage limits", () => {
  resetProviderUsageTelemetryCacheForTests();
  const snapshots = {
    s1: createSnapshot({
      providerSummary: "Codex",
      providerScopeKey: "codex:global",
      tokenUsage: { used: 512, limit: 2_000 },
    }),
    s2: createSnapshot({
      providerSummary: "Codex",
      providerScopeKey: "codex:global",
      tokenUsage: { used: 128, limit: 1_000 },
    }),
  };

  const next = updateSnapshotsWithUsageLimits(snapshots, {
    sessionId: "s1",
    event: {
      type: "stream_event",
      providerSessionId: "provider-session-replay",
      data: {
        kind: "usage_limits",
        providerScopeKey: "codex:provider-session-replay",
        usageLimits: {
          currentSession: {
            percentUsed: 33,
            resetsAt: "2026-04-18T12:00:00.000Z",
          },
        },
      },
    },
  });

  assert.equal(next.s1.status.usageLimits?.currentSession?.percentUsed, 33);
  assert.equal(next.s2.status.usageLimits?.currentSession?.percentUsed, 33);
  assert.deepEqual(next.s1.status.tokenUsage, { used: 512, limit: 2_000 });
  assert.deepEqual(next.s2.status.tokenUsage, { used: 128, limit: 1_000 });
  assert.equal(next.s1.status.connectionState, "running");
  assert.equal(next.s2.status.connectionState, "running");
  assert.equal(next.s1.status.continuityLock?.active, true);
  assert.equal(next.s2.status.continuityLock?.active, true);
});

test("updateSnapshotsWithUsageLimits caches provider telemetry before dialog snapshot exists", () => {
  resetProviderUsageTelemetryCacheForTests();
  const next = updateSnapshotsWithUsageLimits({}, {
    sessionId: "missing-session",
    event: {
      type: "stream_event",
      providerSessionId: "provider-session-replay",
      data: {
        kind: "usage_limits",
        providerScopeKey: "codex:provider-session-replay",
        usageLimits: {
          currentSession: {
            percentUsed: 41,
            resetsAt: "2026-04-22T10:00:00.000Z",
          },
          currentWeekAllModels: {
            percentUsed: 63,
            resetsAt: "2026-04-26T10:00:00.000Z",
          },
        },
      },
    },
  });

  assert.deepEqual(next, {});

  const seeded = seedSnapshotWithCachedUsageLimits(
    createSnapshot({
      providerSummary: "Codex",
      providerScopeKey: "codex:global",
    })
  );

  assert.equal(seeded.status.providerScopeKey, "codex:global");
  assert.equal(seeded.status.usageLimits?.currentSession?.percentUsed, 41);
  assert.equal(
    seeded.status.usageLimits?.currentWeekAllModels?.percentUsed,
    63
  );
});
