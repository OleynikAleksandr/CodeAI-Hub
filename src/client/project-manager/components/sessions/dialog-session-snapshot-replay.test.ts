import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import type { SessionSnapshot } from "../../../../types/session";
import type { WorkspaceSnapshotPushPayload } from "../../core-stream-message-types";
import { mergeHistoryIntoSnapshots, type SessionSnapshots } from "../../../ui/src/session/helpers";
import { resolveRuntimeSessionFromWorkspaceSnapshot } from "./dialog-runtime-session-resolver";
import { appendDedupedSessionMessageToSnapshots, appendOptimisticUserMessage } from "./session-message-dedupe";

const CONTROLLER_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts"
);

const CORE_EVENTS_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts"
);
const BOOTSTRAP_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/dialog-session-bootstrap.ts"
);
const RUNTIME_RESOLVER_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/dialog-runtime-session-resolver.ts"
);
const DEDUPE_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/session-message-dedupe.ts"
);

type ShouldSuppressIdleDialogRestoreRefresh = typeof import("./use-project-manager-dialog-core-events")["shouldSuppressIdleDialogRestoreRefresh"];

const assertIncludes = (source: string, pattern: string, message: string): void =>
  assert.equal(source.includes(pattern), true, message);

const createSnapshot = (): SessionSnapshot => ({
  messages: [],
  todos: [],
  draft: "",
  binding: {
    providerSessionId: null,
    status: "pending",
  },
  status: {
    providerSummary: "Codex",
    tokenUsage: {
      used: 0,
      limit: 200_000,
    },
    connectionState: "idle",
    updatedAt: Date.now(),
  },
});

const createWorkspaceSnapshotPayload = (params: {
  readonly workspaceRoot?: string;
  readonly sessions: WorkspaceSnapshotPushPayload["snapshot"]["sessions"];
}): WorkspaceSnapshotPushPayload => ({
  workspaceRoot: params.workspaceRoot ?? "/workspace",
  selectionId: "selection-1",
  sequence: 1,
  generatedAt: "2026-01-01T00:00:00.000Z",
  snapshot: {
    workspaceRoot: params.workspaceRoot ?? "/workspace",
    loadState: "ready",
    workflow: { nodes: {} },
    sessions: params.sessions,
    artifacts: { currentByNodeId: {} },
  },
});

const ensureBrowserLikeGlobals = (): void => {
  const globalScope = globalThis as typeof globalThis & {
    CustomEvent?: typeof CustomEvent;
    window?: Window & typeof globalThis;
  };
  if (!globalScope.window) {
    globalScope.window = globalScope as Window & typeof globalThis;
  }
  if (typeof globalScope.window.addEventListener !== "function") {
    globalScope.window.addEventListener = () => {};
  }
  if (typeof globalScope.window.removeEventListener !== "function") {
    globalScope.window.removeEventListener = () => {};
  }
  if (typeof globalScope.window.dispatchEvent !== "function") {
    globalScope.window.dispatchEvent = () => true;
  }
  if (typeof globalScope.CustomEvent !== "function") {
    class TestCustomEvent<T = unknown> extends Event {
      readonly detail: T;

      constructor(type: string, init?: CustomEventInit<T>) {
        super(type, init);
        this.detail = init?.detail as T;
      }
    }
    globalScope.CustomEvent = TestCustomEvent as unknown as typeof CustomEvent;
  }
};

let shouldSuppressIdleDialogRestoreRefreshLoader:
  Promise<ShouldSuppressIdleDialogRestoreRefresh> | null = null;
const loadShouldSuppressIdleDialogRestoreRefresh =
  async (): Promise<ShouldSuppressIdleDialogRestoreRefresh> => {
    ensureBrowserLikeGlobals();
    if (!shouldSuppressIdleDialogRestoreRefreshLoader) {
      shouldSuppressIdleDialogRestoreRefreshLoader = import(
        "./use-project-manager-dialog-core-events"
      ).then((module) => module.shouldSuppressIdleDialogRestoreRefresh);
    }
    return shouldSuppressIdleDialogRestoreRefreshLoader;
  };

test("dialog session controller caches workspace snapshots for replay", async () => {
  const source = await readFile(CONTROLLER_SOURCE_PATH, "utf8");

  assertIncludes(
    source,
    "const latestWorkspaceSnapshotRef = useRef<WorkspaceSnapshotPushPayload | null>(",
    "controller must keep last workspace snapshot to avoid race with dialog:list:result/session:created"
  );
  assertIncludes(source, "latestWorkspaceSnapshotRef.current = payload;", "controller must record latest workspace snapshot payload");
  assertIncludes(source, "latestWorkspaceSnapshotRef,", "controller must pass latest snapshot ref into dialog core events");
});

test("dialog core events replay workspace snapshot after creating base snapshot", async () => {
  const [source, bootstrapSource, resolverSource] = await Promise.all([
    readFile(CORE_EVENTS_SOURCE_PATH, "utf8"),
    readFile(BOOTSTRAP_SOURCE_PATH, "utf8"),
    readFile(RUNTIME_RESOLVER_SOURCE_PATH, "utf8"),
  ]);

  assertIncludes(source, "createDialogBootstrapSnapshots", "dialog core events must delegate bootstrap snapshot creation to helper");
  assertIncludes(bootstrapSource, "applyWorkspaceSnapshotToSnapshots", "bootstrap helper must replay lock state from workspace snapshot");
  assertIncludes(source, "resolveRuntimeSessionFromWorkspaceSnapshot", "dialog core events must resolve runtime sessionId against latest workspace snapshot");
  assertIncludes(source, "resolveProviderId(match.providerId) ?? resolveProviderId(intent.providerId);", "dialog bootstrap must fall back to explicit dialog intent provider when list payload lacks a normalized provider id");
  assertIncludes(resolverSource, "session.providerSessionId === options.providerSessionId", "runtime session fallback must support providerSessionId identity when session ids drift");
});

test("dialog core events dedupe resumed dialog runtime restore requests", async () => {
  const [source, bootstrapSource] = await Promise.all([
    readFile(CORE_EVENTS_SOURCE_PATH, "utf8"),
    readFile(BOOTSTRAP_SOURCE_PATH, "utf8"),
  ]);

  assertIncludes(source, "buildDialogRestoreRequestKey", "dialog open must build a restore request key per continuity entry");
  assertIncludes(source, "shouldCreateRuntimeRestore", "dialog open must consult restore dedupe helper before createSession");
  assertIncludes(source, "providerId: providerId ?? intent.providerId,", "runtime restore must reuse the seeded provider identity instead of re-reading stale dialog list values");
  assertIncludes(source, "options.restoreRequestInFlightRef.current", "dialog open must track in-flight restore requests in a stable ref");
  assertIncludes(bootstrapSource, "RUNTIME_RESTORE_IN_FLIGHT_TTL_MS = 30_000", "restore dedupe helper must expire stale requests after bounded TTL");
  assertIncludes(bootstrapSource, "options.requests.has(options.restoreKey)", "restore dedupe helper must suppress duplicate restore requests for the same dialog continuity entry");
});

test("dialog first-open hydration binds session identity before requesting history", async () => {
  const [controllerSource, coreEventsSource] = await Promise.all([
    readFile(CONTROLLER_SOURCE_PATH, "utf8"),
    readFile(CORE_EVENTS_SOURCE_PATH, "utf8"),
  ]);

  assertIncludes(controllerSource, "sessionRef.current = null;", "controller must clear session ref on intent switch to avoid stale first-open routing");

  const sessionRefBindIndex = coreEventsSource.indexOf(
    "options.sessionRef.current = nextSession;"
  );
  const firstHistoryRequestIndex = coreEventsSource.indexOf(
    "options.requestDialogHistory(dialogIntent, match.dialogId);"
  );
  assert.equal(
    sessionRefBindIndex >= 0 && firstHistoryRequestIndex > sessionRefBindIndex,
    true,
    "dialog list handler must bind sessionRef before the first history request"
  );
});

test("dialog controller keeps restore dedupe state across cold-open retries", async () => {
  const source = await readFile(CONTROLLER_SOURCE_PATH, "utf8");

  assertIncludes(source, "const restoreRequestInFlightRef = useRef(new Map<string, number>())", "controller must keep restore request dedupe state across repeated dialog:list results");
  assertIncludes(source, "restoreRequestInFlightRef.current.clear();", "controller must clear restore dedupe state when dialog intent changes");
  assertIncludes(source, "restoreRequestInFlightRef,", "controller must pass restore dedupe ref into dialog core events");
});

test("dialog controller retries stalled cold-open history request after timeout", async () => {
  const source = await readFile(CONTROLLER_SOURCE_PATH, "utf8");

  assertIncludes(source, "window.setTimeout(() => {", "controller must schedule watchdog timeout for cold-open history");
  assertIncludes(source, "pendingHistoryCursorRef.current.has(dialogId)", "watchdog must verify request is still pending before retry");
  assertIncludes(source, "loadedDialogIdsRef.current.delete(dialogId);", "watchdog must clear loaded marker before forced retry");
  assertIncludes(source, "requestDialogHistory(activeIntent, dialogId, 0, { force: true });", "watchdog must issue a forced full-history retry for stalled cold-open");
});

test("projected dialog restore uses worktree workspace identity", async () => {
  const [controllerSource, coreEventsSource] = await Promise.all([
    readFile(CONTROLLER_SOURCE_PATH, "utf8"),
    readFile(CORE_EVENTS_SOURCE_PATH, "utf8"),
  ]);

  assertIncludes(coreEventsSource, "const dialogWorkspacePath = match.worktreePath ?? intent.workspacePath;", "projected dialogs must prefer worktree path over main workspace for runtime restore");
  assertIncludes(coreEventsSource, "options.pendingIntentRef.current = dialogIntent;", "projected dialogs must keep the resolved worktree intent for later live refreshes");
  assertIncludes(coreEventsSource, "workspacePath: dialogWorkspacePath,", "dialog restore must create or resume sessions inside the node worktree");
  assertIncludes(coreEventsSource, "options.requestDialogHistory(dialogIntent, match.dialogId);", "projected dialogs must request initial history from the worktree intent");
  assertIncludes(controllerSource, "created.workspacePath === current.workspacePath", "controller must adopt restored projected runtime sessions from their worktree");
  assertIncludes(controllerSource, "workspacePath: intent.workspacePath,", "dialog commands must carry the resolved workspace root to Core");
});

test("projected dialog stream events request tail history refresh", async () => {
  const [controllerSource, turnStateSource] = await Promise.all([
    readFile(CONTROLLER_SOURCE_PATH, "utf8"),
    readFile(path.resolve(process.cwd(), "src/client/project-manager/components/sessions/turn-state-stream.ts"), "utf8"),
  ]);

  assertIncludes(controllerSource, "shouldRefreshDialogHistoryForStream", "controller must route projected worktree stream events into dialog history refresh");
  assertIncludes(controllerSource, "requestDialogHistory(activeIntent, dialogId, cursor, { force: cursor <= 0 });", "controller must refresh the active dialog tail after matching turn-state events");
  assertIncludes(controllerSource, "applyDialogManagedReviewPendingLock", "managed review confirmation must visibly lock the projected dialog while Core processes the action");
  assertIncludes(turnStateSource, "turnState.providerSessionId ===", "turn-state matching must support projected dialogs whose visible id differs from runtime session id");
});

test("dialog restore refresh suppression treats snapshot-confirmed idle dialog as terminally hydrated", async () => {
  const shouldSuppressIdleDialogRestoreRefresh =
    await loadShouldSuppressIdleDialogRestoreRefresh();
  const missingRuntime = shouldSuppressIdleDialogRestoreRefresh({
    latestSnapshot: createWorkspaceSnapshotPayload({
      sessions: {},
    }),
    workspacePath: "/workspace",
    dialogId: "dialog-1",
    providerSessionId: "provider-session-1",
    preferredSessionId: "runtime-1",
  });
  const liveRuntime = shouldSuppressIdleDialogRestoreRefresh({
    latestSnapshot: createWorkspaceSnapshotPayload({
      sessions: {
        "runtime-1": {
          nodeId: "node-1",
          providerSessionId: "provider-session-1",
          turnState: "running",
          continuityLockActive: false,
        },
      },
    }),
    workspacePath: "/workspace",
    dialogId: "dialog-1",
    providerSessionId: "provider-session-1",
    preferredSessionId: "runtime-1",
  });
  const foreignWorkspace = shouldSuppressIdleDialogRestoreRefresh({
    latestSnapshot: createWorkspaceSnapshotPayload({
      workspaceRoot: "/other-workspace",
      sessions: {},
    }),
    workspacePath: "/workspace",
    dialogId: "dialog-1",
    providerSessionId: "provider-session-1",
    preferredSessionId: "runtime-1",
  });

  assert.equal(missingRuntime, true);
  assert.equal(liveRuntime, false);
  assert.equal(foreignWorkspace, false);
});

test("dialog runtime resolver prefers existing boundary runtime by preferred session id", () => {
  const resolved = resolveRuntimeSessionFromWorkspaceSnapshot({
    payload: createWorkspaceSnapshotPayload({
      sessions: {
        "managed-boundary-session": {
          nodeId: "quality_gates",
          turnState: "idle",
          continuityLockActive: false,
        },
      },
    }),
    preferredSessionId: "managed-boundary-session",
    dialogId: "quality-gates-dialog",
    providerSessionId: null,
  });

  assert.deepEqual(resolved, {
    runtimeSessionId: "managed-boundary-session",
    hasRuntimeSession: true,
  });
});

test("dialog snapshot replay reconciles optimistic stop-resend user bubble with canonical tail history", () => {
  const sessionId = "dialog-session";
  const optimisticSnapshots = appendOptimisticUserMessage(
    { [sessionId]: createSnapshot() } satisfies SessionSnapshots,
    sessionId,
    "Retry this turn"
  );
  const optimisticMessage = optimisticSnapshots[sessionId]?.messages[0];
  assert.ok(optimisticMessage);
  assert.equal(optimisticSnapshots[sessionId]?.messages.length, 1);
  assert.equal(optimisticMessage.id.startsWith("optimistic-"), true);

  const reconciled = appendDedupedSessionMessageToSnapshots(optimisticSnapshots, {
    sessionId,
    message: {
      id: "canonical-user-1",
      role: "user",
      content: "Retry this turn",
      createdAt: optimisticMessage.createdAt + 250,
    },
  });

  assert.deepEqual(reconciled[sessionId]?.messages, [
    {
      id: "canonical-user-1",
      role: "user",
      content: "Retry this turn",
      createdAt: optimisticMessage.createdAt + 250,
    },
  ]);

  const repeatedTailMerge = appendDedupedSessionMessageToSnapshots(reconciled, {
    sessionId,
    message: {
      id: "canonical-user-1",
      role: "user",
      content: "Retry this turn",
      createdAt: optimisticMessage.createdAt + 250,
    },
  });

  assert.equal(repeatedTailMerge[sessionId]?.messages.length, 1);
  assert.equal(repeatedTailMerge[sessionId]?.messages[0]?.id, "canonical-user-1");
});

test("dialog snapshot replay rebuilds from canonical history without reviving optimistic duplicate after workspace switch", () => {
  const sessionId = "dialog-session";
  const optimisticSnapshots = appendOptimisticUserMessage(
    { [sessionId]: createSnapshot() } satisfies SessionSnapshots,
    sessionId,
    "Retry this turn"
  );
  const optimisticMessage = optimisticSnapshots[sessionId]?.messages[0];
  assert.ok(optimisticMessage);

  const canonicalHistory = [
    {
      id: "canonical-user-1",
      role: "user" as const,
      content: "Retry this turn",
      createdAt: optimisticMessage.createdAt + 500,
    },
    {
      id: "canonical-assistant-1",
      role: "assistant" as const,
      content: "Done",
      createdAt: optimisticMessage.createdAt + 1_000,
    },
  ];

  const rebuilt = mergeHistoryIntoSnapshots(
    { [sessionId]: createSnapshot() } satisfies SessionSnapshots,
    {
      sessionId,
      messages: canonicalHistory,
    }
  );

  assert.deepEqual(rebuilt[sessionId]?.messages, canonicalHistory);
  assert.equal(
    rebuilt[sessionId]?.messages.some((message) =>
      message.id.startsWith("optimistic-")
    ),
    false
  );
});

test("dialog tail replay keeps optimistic reconciliation separate from full-history rebuild path", async () => {
  const [coreEventsSource, dedupeSource] = await Promise.all([
    readFile(CORE_EVENTS_SOURCE_PATH, "utf8"),
    readFile(DEDUPE_SOURCE_PATH, "utf8"),
  ]);

  assert.equal(
    coreEventsSource.includes("const isTail = requestedCursor > 0;"),
    true,
    "dialog history handler must continue to distinguish tail refresh from full rebuild"
  );
  assert.equal(
    coreEventsSource.includes(
      "let updated = previous;\n            for (const normalized of normalizedMessages) {"
    ),
    true,
    "full replay path must apply canonical history through message side effects"
  );
  assert.equal(
    coreEventsSource.includes("updated = appendDedupedSessionMessageToSnapshots(updated, {"),
    true,
    "dialog history refresh must flow through dedupe reconciliation for both full and tail replay"
  );
  assert.equal(
    dedupeSource.includes("const optimisticCandidateIndex = findOptimisticUserCandidateIndex("),
    true,
    "dedupe layer must look for optimistic user placeholder before appending canonical tail"
  );
  assert.equal(
    dedupeSource.includes("messages[optimisticCandidateIndex] = payload.message;"),
    true,
    "dedupe layer must replace optimistic stop-resend bubble with canonical message"
  );
});

test("dialog restore path keeps snapshot-confirmed idle dialogs ready and suppresses self-refresh churn", async () => {
  const [controllerSource, coreEventsSource] = await Promise.all([
    readFile(CONTROLLER_SOURCE_PATH, "utf8"),
    readFile(CORE_EVENTS_SOURCE_PATH, "utf8"),
  ]);

  assert.equal(
    coreEventsSource.includes("const shouldKeepIdleDialogBootstrapReady ="),
    true,
    "dialog bootstrap must recognize snapshot-confirmed idle dialogs before creating restore placeholders"
  );
  assert.equal(
    coreEventsSource.includes(
      "!shouldKeepIdleDialogBootstrapReady &&\n          match.providerSessionId &&"
    ),
    true,
    "dialog restore must skip createSession when workspace snapshot already proves there is no live runtime"
  );
  assert.equal(
    coreEventsSource.includes("currentSession.binding.status === \"ready\" &&"),
    true,
    "dialog message reread path must suppress self-refresh only for ready idle bootstrap dialogs"
  );
  assert.equal(
    coreEventsSource.includes("shouldSuppressIdleDialogRestoreRefresh({"),
    true,
    "dialog core events must reuse idle-runtime suppression helper for restore and reread gating"
  );
  assert.equal(
    controllerSource.includes("currentSession.binding.status !== \"ready\" &&"),
    true,
    "controller must only auto-promote unresolved placeholders when snapshot later confirms there is no runtime session"
  );
  assert.equal(
    controllerSource.includes("status: \"ready\","),
    true,
    "controller must convert stale pending placeholder to ready when idle dialog snapshot catches up"
  );
});

test("dialog restore bootstrap stays pending until runtime session materializes", async () => {
  const [controllerSource, coreEventsSource] = await Promise.all([
    readFile(CONTROLLER_SOURCE_PATH, "utf8"),
    readFile(CORE_EVENTS_SOURCE_PATH, "utf8"),
  ]);

  assert.equal(
    coreEventsSource.includes('status: "pending" as const'),
    true,
    "dialog bootstrap must keep placeholder session binding pending when runtime session is still absent"
  );
  assert.equal(
    controllerSource.includes('current.binding.status !== "ready"'),
    true,
    "dialog controller must detect unresolved placeholder sessions before adopting a materialized runtime session"
  );
  assert.equal(
    controllerSource.includes("const isSameKind = created.sessionKind === current.sessionKind;"),
    false,
    "dialog restore adoption must not depend on sessionKind equality because runtime session:created does not preserve PM bootstrap sessionKind"
  );
  assert.equal(
    controllerSource.includes(
      "currentProviderSessionId === createdProviderSessionId"
    ),
    true,
    "dialog controller must match late runtime materialization by providerSessionId continuity"
  );
  assert.equal(
    controllerSource.includes("const { [current.id]: _discarded, ...withoutPlaceholder } = next;"),
    true,
    "dialog controller must remove the placeholder snapshot after adopting the real runtime session"
  );
});
