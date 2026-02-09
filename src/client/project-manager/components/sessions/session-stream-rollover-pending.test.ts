import assert from "node:assert/strict";
import test from "node:test";
import type { SessionSnapshot } from "../../../../types/session";
import type { WorkspaceSnapshotPushPayload } from "../../core-stream-message-types";
import type { SessionSnapshots } from "../../../ui/src/session/helpers";

type ApplyWorkspaceSnapshotToSnapshots = typeof import("./session-stream")["applyWorkspaceSnapshotToSnapshots"];

const ensureBrowserLikeGlobals = (): void => {
  const globalScope = globalThis as typeof globalThis & {
    window?: Window & typeof globalThis;
  };
  if (!globalScope.window) {
    globalScope.window = globalScope as Window & typeof globalThis;
  }
  if (typeof globalScope.window.addEventListener !== "function") {
    globalScope.window.addEventListener = () => {
      // noop
    };
  }
  if (typeof globalScope.window.removeEventListener !== "function") {
    globalScope.window.removeEventListener = () => {
      // noop
    };
  }
};

const loadApplyWorkspaceSnapshotToSnapshots =
  async (): Promise<ApplyWorkspaceSnapshotToSnapshots> => {
    ensureBrowserLikeGlobals();
    const module = await import("./session-stream");
    return module.applyWorkspaceSnapshotToSnapshots;
  };

const createSnapshot = (): SessionSnapshot => ({
  messages: [],
  todos: [],
  draft: "",
  binding: { providerSessionId: null, status: "pending" },
  status: {
    providerSummary: "Codex",
    tokenUsage: { used: 0, limit: 200_000 },
    connectionState: "blocked",
    continuityLock: {
      active: true,
      reason: "threshold_reached",
      updatedAt: Date.now(),
    },
    updatedAt: Date.now(),
  },
});

const createPayload = (
  sequence: number,
  reason: "no_rollover_needed" | "resume_ready"
): WorkspaceSnapshotPushPayload => ({
  workspaceRoot: "/workspace",
  selectionId: "selection-1",
  sequence,
  generatedAt: "2026-01-01T00:00:00.000Z",
  snapshot: {
    workspaceRoot: "/workspace",
    loadState: "ready",
    workflow: { nodes: {} },
    sessions: {
      source: {
        nodeId: "node-1",
        turnState: "idle",
        continuityLockActive: false,
        continuityLockReason: reason,
        resumeMode: "resume_via_rollover",
        finalTurnCompleted: true,
      },
    },
    artifacts: { currentByNodeId: {} },
  },
});

const createContextPendingPayload = (
  sequence: number,
  reason: "context_check_pending" | "no_rollover_needed"
): WorkspaceSnapshotPushPayload => ({
  workspaceRoot: "/workspace",
  selectionId: "selection-1",
  sequence,
  generatedAt: "2026-01-01T00:00:00.000Z",
  snapshot: {
    workspaceRoot: "/workspace",
    loadState: "ready",
    workflow: { nodes: {} },
    sessions: {
      source: {
        nodeId: "node-1",
        turnState: "idle",
        continuityLockActive: false,
        continuityLockReason: reason,
        resumeMode: "resume_in_place",
        finalTurnCompleted: true,
      },
    },
    artifacts: { currentByNodeId: {} },
  },
});

test("applyWorkspaceSnapshotToSnapshots keeps resume_via_rollover blocked until resume_ready", async () => {
  const applyWorkspaceSnapshotToSnapshots =
    await loadApplyWorkspaceSnapshotToSnapshots();
  const base: SessionSnapshots = { source: createSnapshot() };

  const pending = applyWorkspaceSnapshotToSnapshots(
    base,
    createPayload(1, "no_rollover_needed")
  );
  const ready = applyWorkspaceSnapshotToSnapshots(
    pending,
    createPayload(2, "resume_ready")
  );

  assert.equal(pending.source.status.connectionState, "blocked");
  assert.equal(pending.source.status.continuityLock?.active, true);
  assert.equal(ready.source.status.connectionState, "idle");
  assert.equal(ready.source.status.continuityLock?.active, false);
  assert.equal(ready.source.status.continuityLock?.reason, "resume_ready");
});

test("applyWorkspaceSnapshotToSnapshots keeps blocked while context decision is pending", async () => {
  const applyWorkspaceSnapshotToSnapshots =
    await loadApplyWorkspaceSnapshotToSnapshots();
  const base: SessionSnapshots = { source: createSnapshot() };

  const pending = applyWorkspaceSnapshotToSnapshots(
    base,
    createContextPendingPayload(1, "context_check_pending")
  );
  const unlocked = applyWorkspaceSnapshotToSnapshots(
    pending,
    createContextPendingPayload(2, "no_rollover_needed")
  );

  assert.equal(pending.source.status.connectionState, "blocked");
  assert.equal(pending.source.status.continuityLock?.active, true);
  assert.equal(
    pending.source.status.continuityLock?.reason,
    "context_check_pending"
  );
  assert.equal(unlocked.source.status.connectionState, "idle");
  assert.equal(unlocked.source.status.continuityLock?.active, false);
  assert.equal(
    unlocked.source.status.continuityLock?.reason,
    "no_rollover_needed"
  );
});
