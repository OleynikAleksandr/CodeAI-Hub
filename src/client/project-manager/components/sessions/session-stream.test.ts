import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import type { SessionSnapshot } from "../../../../types/session";
import type {
  WorkspaceSnapshotContinuityLockReason,
  WorkspaceSnapshotPushPayload,
} from "../../core-stream-message-types";
import type { SessionSnapshots } from "../../../ui/src/session/helpers";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/session-stream.ts"
);

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

let applyWorkspaceSnapshotToSnapshotsLoader:
  | Promise<ApplyWorkspaceSnapshotToSnapshots>
  | null = null;
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

test("session-stream remains a transport layer for session events", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(source.includes('if (message.type === "session:created")'), true);
  assert.equal(source.includes("params.onSessionCreated(normalized);"), true);
  assert.equal(source.includes('if (message.type === "session:stream")'), true);
  assert.equal(source.includes('if (message.type === "workspace:snapshot")'), true);
  assert.equal(source.includes("params.onWorkspaceSnapshot?.(payload);"), true);
  assert.equal(source.includes("turn_state"), false);
  assert.equal(source.includes("continuity_lock"), false);
  assert.equal(source.includes("setActiveSessionId"), false);
});

test("applyWorkspaceSnapshotToSnapshots prevents blocked->idle->blocked flicker during handoff snapshots", async () => {
  const applyWorkspaceSnapshotToSnapshots =
    await loadApplyWorkspaceSnapshotToSnapshots();
  const base: SessionSnapshots = {
    source: createSnapshot({
      connectionState: "blocked",
      continuityLockActive: true,
      continuityLockReason: "threshold_reached",
    }),
  };

  const handoffAwaiting = applyWorkspaceSnapshotToSnapshots(
    base,
    createWorkspaceSnapshotPayload({
      sequence: 10,
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
  const handoffLocked = applyWorkspaceSnapshotToSnapshots(
    handoffAwaiting,
    createWorkspaceSnapshotPayload({
      sequence: 11,
      sessions: {
        source: createWorkspaceSession({
          turnState: "idle",
          continuityLockActive: true,
          continuityLockReason: "report_in_progress",
        }),
      },
    })
  );

  assert.equal(handoffAwaiting.source.status.connectionState, "blocked");
  assert.equal(handoffLocked.source.status.connectionState, "blocked");
});

test("applyWorkspaceSnapshotToSnapshots keeps both source and target locked when awaitingBootstrapTurn=true", async () => {
  const applyWorkspaceSnapshotToSnapshots =
    await loadApplyWorkspaceSnapshotToSnapshots();
  const base: SessionSnapshots = {
    source: createSnapshot({
      connectionState: "idle",
      continuityLockActive: false,
    }),
    target: createSnapshot({
      connectionState: "idle",
      continuityLockActive: false,
    }),
  };

  const next = applyWorkspaceSnapshotToSnapshots(
    base,
    createWorkspaceSnapshotPayload({
      sequence: 20,
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
        target: createWorkspaceSession({
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

  assert.equal(next.source.status.connectionState, "blocked");
  assert.equal(next.target.status.connectionState, "blocked");
  assert.equal(next.source.status.continuityLock?.active, true);
  assert.equal(next.target.status.continuityLock?.active, true);
});

test("applyWorkspaceSnapshotToSnapshots unlocks only after terminal continuity reason snapshot", async () => {
  const applyWorkspaceSnapshotToSnapshots =
    await loadApplyWorkspaceSnapshotToSnapshots();
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
          continuityLockReason: "resume_ready",
        }),
      },
    })
  );

  assert.equal(nonTerminal.source.status.connectionState, "blocked");
  assert.equal(nonTerminal.source.status.continuityLock?.active, true);
  assert.equal(terminal.source.status.connectionState, "idle");
  assert.equal(terminal.source.status.continuityLock?.active, false);
  assert.equal(terminal.source.status.continuityLock?.reason, "resume_ready");
});
