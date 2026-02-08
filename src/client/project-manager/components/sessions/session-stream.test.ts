import assert from "node:assert/strict";
import test from "node:test";
import type { SessionSnapshot } from "../../../../types/session";
import type {
  WorkspaceSnapshotContinuityLockReason,
  WorkspaceSnapshotPushPayload,
} from "../../core-stream-message-types";
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

let applyWorkspaceSnapshotToSnapshotsLoader: Promise<ApplyWorkspaceSnapshotToSnapshots> | null = null;
const loadApplyWorkspaceSnapshotToSnapshots = async (): Promise<ApplyWorkspaceSnapshotToSnapshots> => {
  ensureBrowserLikeGlobals();
  if (!applyWorkspaceSnapshotToSnapshotsLoader) {
    applyWorkspaceSnapshotToSnapshotsLoader = import("./session-stream").then(
      (module) => module.applyWorkspaceSnapshotToSnapshots
    );
  }
  return applyWorkspaceSnapshotToSnapshotsLoader;
};

const createSnapshot = (params: {
  readonly connectionState: "idle" | "running" | "blocked";
  readonly continuityLockActive: boolean;
  readonly continuityLockReason?: string;
}): SessionSnapshot => ({
  messages: [],
  todos: [],
  draft: "",
  binding: {
    providerSessionId: null,
    status: "pending",
  },
  status: {
    providerSummary: "Codex",
    tokenUsage: { used: 0, limit: 200_000 },
    connectionState: params.connectionState,
    continuityLock: {
      active: params.continuityLockActive,
      ...(params.continuityLockReason
        ? { reason: params.continuityLockReason }
        : {}),
      updatedAt: Date.now(),
    },
    updatedAt: Date.now(),
  },
});

const createWorkspaceSession = (params: {
  readonly turnState: "idle" | "running";
  readonly continuityLockActive: boolean;
  readonly continuityLockReason?: WorkspaceSnapshotContinuityLockReason;
  readonly resumeMode?: "no_resume" | "resume_in_place" | "resume_via_rollover";
  readonly finalTurnCompleted?: boolean;
  readonly terminalLockReason?: "terminal_no_resume";
  readonly transition?: {
    readonly reason: WorkspaceSnapshotContinuityLockReason;
    readonly sourceSessionId: string;
    readonly targetSessionId: string;
    readonly awaitingBootstrapTurn: boolean;
  };
}): WorkspaceSnapshotPushPayload["snapshot"]["sessions"][string] => ({
  nodeId: "node-1",
  turnState: params.turnState,
  continuityLockActive: params.continuityLockActive,
  ...(params.continuityLockReason
    ? { continuityLockReason: params.continuityLockReason }
    : {}),
  ...(params.resumeMode ? { resumeMode: params.resumeMode } : {}),
  ...(typeof params.finalTurnCompleted === "boolean"
    ? { finalTurnCompleted: params.finalTurnCompleted }
    : {}),
  ...(params.terminalLockReason
    ? { terminalLockReason: params.terminalLockReason }
    : {}),
  ...(params.transition
    ? {
        continuityLockTransition: {
          rolloverId: "rollover-1",
          sourceSessionId: params.transition.sourceSessionId,
          targetSessionId: params.transition.targetSessionId,
          reason: params.transition.reason,
          awaitingBootstrapTurn: params.transition.awaitingBootstrapTurn,
          updatedAt: "2026-01-01T00:00:00.000Z",
        },
      }
    : {}),
});

const createWorkspaceSnapshotPayload = (params: {
  readonly sequence: number;
  readonly sessions: WorkspaceSnapshotPushPayload["snapshot"]["sessions"];
}): WorkspaceSnapshotPushPayload => ({
  workspaceRoot: "/workspace",
  selectionId: "selection-1",
  sequence: params.sequence,
  generatedAt: "2026-01-01T00:00:00.000Z",
  snapshot: {
    workspaceRoot: "/workspace",
    loadState: "ready",
    workflow: { nodes: {} },
    sessions: params.sessions,
    artifacts: { currentByNodeId: {} },
  },
});

test("applyWorkspaceSnapshotToSnapshots keeps source/target locked until resume_ready after bootstrap gate", async () => {
  const applyWorkspaceSnapshotToSnapshots = await loadApplyWorkspaceSnapshotToSnapshots();
  const base: SessionSnapshots = {
    source: createSnapshot({
      connectionState: "blocked",
      continuityLockActive: true,
      continuityLockReason: "threshold_reached",
    }),
    target: createSnapshot({
      connectionState: "blocked",
      continuityLockActive: true,
      continuityLockReason: "resume_bootstrap",
    }),
  };

  const awaitingBootstrap = applyWorkspaceSnapshotToSnapshots(
    base,
    createWorkspaceSnapshotPayload({
      sequence: 20,
      sessions: {
        source: createWorkspaceSession({
          turnState: "idle",
          continuityLockActive: false,
          resumeMode: "resume_via_rollover",
          finalTurnCompleted: true,
          transition: {
            reason: "resume_bootstrap",
            sourceSessionId: "source",
            targetSessionId: "target",
            awaitingBootstrapTurn: true,
          },
        }),
        target: createWorkspaceSession({
          turnState: "idle",
          continuityLockActive: false,
          resumeMode: "resume_via_rollover",
          finalTurnCompleted: true,
          transition: {
            reason: "resume_bootstrap",
            sourceSessionId: "source",
            targetSessionId: "target",
            awaitingBootstrapTurn: true,
          },
        }),
      },
    })
  );
  const preReady = applyWorkspaceSnapshotToSnapshots(
    awaitingBootstrap,
    createWorkspaceSnapshotPayload({
      sequence: 21,
      sessions: {
        source: createWorkspaceSession({
          turnState: "idle",
          continuityLockActive: false,
          continuityLockReason: "resume_bootstrap",
          resumeMode: "resume_via_rollover",
          finalTurnCompleted: true,
        }),
        target: createWorkspaceSession({
          turnState: "idle",
          continuityLockActive: false,
          continuityLockReason: "resume_bootstrap",
          resumeMode: "resume_via_rollover",
          finalTurnCompleted: true,
        }),
      },
    })
  );
  const ready = applyWorkspaceSnapshotToSnapshots(
    preReady,
    createWorkspaceSnapshotPayload({
      sequence: 22,
      sessions: {
        source: createWorkspaceSession({
          turnState: "idle",
          continuityLockActive: false,
          continuityLockReason: "resume_ready",
          resumeMode: "resume_via_rollover",
          finalTurnCompleted: true,
        }),
        target: createWorkspaceSession({
          turnState: "idle",
          continuityLockActive: false,
          continuityLockReason: "resume_ready",
          resumeMode: "resume_via_rollover",
          finalTurnCompleted: true,
        }),
      },
    })
  );

  assert.equal(awaitingBootstrap.source.status.connectionState, "blocked");
  assert.equal(awaitingBootstrap.target.status.connectionState, "blocked");
  assert.equal(preReady.source.status.connectionState, "blocked");
  assert.equal(preReady.target.status.connectionState, "blocked");
  assert.equal(ready.source.status.connectionState, "idle");
  assert.equal(ready.target.status.connectionState, "idle");
  assert.equal(ready.source.status.continuityLock?.active, false);
  assert.equal(ready.target.status.continuityLock?.active, false);
});

test("applyWorkspaceSnapshotToSnapshots unlocks only after terminal continuity reason snapshot", async () => {
  const applyWorkspaceSnapshotToSnapshots = await loadApplyWorkspaceSnapshotToSnapshots();
  const base: SessionSnapshots = {
    source: createSnapshot({
      connectionState: "blocked",
      continuityLockActive: true,
      continuityLockReason: "resume_bootstrap",
    }),
  };

  const nonTerminal = applyWorkspaceSnapshotToSnapshots(
    base,
    createWorkspaceSnapshotPayload({
      sequence: 30,
      sessions: {
        source: createWorkspaceSession({
          turnState: "idle",
          continuityLockActive: false,
          transition: {
            reason: "resume_bootstrap",
            sourceSessionId: "source",
            targetSessionId: "target",
            awaitingBootstrapTurn: true,
          },
        }),
      },
    })
  );
  const terminal = applyWorkspaceSnapshotToSnapshots(
    nonTerminal,
    createWorkspaceSnapshotPayload({
      sequence: 31,
      sessions: {
        source: createWorkspaceSession({
          turnState: "idle",
          continuityLockActive: false,
          continuityLockReason: "no_rollover_needed",
          resumeMode: "resume_in_place",
          finalTurnCompleted: true,
        }),
      },
    })
  );

  assert.equal(nonTerminal.source.status.connectionState, "blocked");
  assert.equal(nonTerminal.source.status.continuityLock?.active, true);
  assert.equal(terminal.source.status.connectionState, "idle");
  assert.equal(terminal.source.status.continuityLock?.active, false);
  assert.equal(
    terminal.source.status.continuityLock?.reason,
    "no_rollover_needed"
  );

  const noResume = applyWorkspaceSnapshotToSnapshots(
    { collector: createSnapshot({ connectionState: "idle", continuityLockActive: false }) },
    createWorkspaceSnapshotPayload({
      sequence: 32,
      sessions: {
        collector: createWorkspaceSession({
          turnState: "idle",
          continuityLockActive: false,
          resumeMode: "no_resume",
          finalTurnCompleted: true,
          terminalLockReason: "terminal_no_resume",
        }),
      },
    })
  );
  assert.equal(noResume.collector.status.connectionState, "blocked");
  assert.equal(noResume.collector.status.continuityLock?.active, true);
  assert.equal(noResume.collector.status.continuityLock?.reason, "terminal_no_resume");
});
