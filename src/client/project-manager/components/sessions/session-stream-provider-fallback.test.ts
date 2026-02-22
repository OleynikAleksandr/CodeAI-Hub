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

let applyWorkspaceSnapshotToSnapshotsLoader: Promise<ApplyWorkspaceSnapshotToSnapshots> | null =
  null;
const loadApplyWorkspaceSnapshotToSnapshots = async (): Promise<ApplyWorkspaceSnapshotToSnapshots> => {
  ensureBrowserLikeGlobals();
  if (!applyWorkspaceSnapshotToSnapshotsLoader) {
    applyWorkspaceSnapshotToSnapshotsLoader = import("./session-stream").then(
      (module) => module.applyWorkspaceSnapshotToSnapshots
    );
  }
  return applyWorkspaceSnapshotToSnapshotsLoader;
};

const createSnapshot = (): SessionSnapshot => ({
  messages: [],
  todos: [],
  draft: "",
  binding: {
    providerSessionId: "provider-session-1",
    status: "ready",
  },
  status: {
    providerSummary: "Claude",
    tokenUsage: { used: 0, limit: 200_000 },
    connectionState: "blocked",
    continuityLock: {
      active: true,
      reason: "resume_bootstrap",
      updatedAt: Date.now(),
    },
    updatedAt: Date.now(),
  },
});

const createWorkspaceSnapshotPayload = (): WorkspaceSnapshotPushPayload => ({
  workspaceRoot: "/workspace",
  selectionId: "selection-1",
  sequence: 40,
  generatedAt: "2026-01-01T00:00:00.000Z",
  snapshot: {
    workspaceRoot: "/workspace",
    loadState: "ready",
    workflow: { nodes: {} },
    sessions: {
      runtime: {
        nodeId: "node-1",
        turnState: "idle",
        continuityLockActive: false,
        continuityLockReason: "resume_ready",
        resumeMode: "resume_via_rollover",
        finalTurnCompleted: true,
        providerSessionId: "provider-session-1",
      },
    },
    artifacts: { currentByNodeId: {} },
  },
});

const createWorkspaceSnapshotPayloadWithoutLockReason =
  (): WorkspaceSnapshotPushPayload => ({
    workspaceRoot: "/workspace",
    selectionId: "selection-1",
    sequence: 41,
    generatedAt: "2026-01-01T00:00:00.000Z",
    snapshot: {
      workspaceRoot: "/workspace",
      loadState: "ready",
      workflow: { nodes: {} },
      sessions: {
        runtime: {
          nodeId: "node-1",
          turnState: "idle",
          continuityLockActive: false,
          resumeMode: "resume_in_place",
          finalTurnCompleted: true,
          providerSessionId: "provider-session-1",
        },
      },
      artifacts: { currentByNodeId: {} },
    },
  });

test("applyWorkspaceSnapshotToSnapshots falls back to providerSessionId when runtime sessionId drifts", async () => {
  const applyWorkspaceSnapshotToSnapshots = await loadApplyWorkspaceSnapshotToSnapshots();
  const base: SessionSnapshots = {
    dialog: createSnapshot(),
  };

  const next = applyWorkspaceSnapshotToSnapshots(
    base,
    createWorkspaceSnapshotPayload()
  );

  assert.equal(next.dialog.status.connectionState, "idle");
  assert.equal(next.dialog.status.continuityLock?.active, false);
  assert.equal(next.dialog.status.continuityLock?.reason, "resume_ready");
  assert.equal(
    Object.prototype.hasOwnProperty.call(next, "runtime"),
    false
  );
});

test("applyWorkspaceSnapshotToSnapshots unlocks idle snapshot when lock reason is missing", async () => {
  const applyWorkspaceSnapshotToSnapshots = await loadApplyWorkspaceSnapshotToSnapshots();
  const base: SessionSnapshots = {
    dialog: createSnapshot(),
  };

  const next = applyWorkspaceSnapshotToSnapshots(
    base,
    createWorkspaceSnapshotPayloadWithoutLockReason()
  );

  assert.equal(next.dialog.status.connectionState, "idle");
  assert.equal(next.dialog.status.continuityLock?.active, false);
});
