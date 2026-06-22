import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/project-manager-session-view.tsx"
);
const DIALOG_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/project-manager-dialog-session-view.tsx"
);
const DIALOG_SESSION_CONTROLLER_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/use-project-manager-dialog-session-controller.ts"
);
const DIALOG_CORE_EVENTS_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/use-project-manager-dialog-core-events.ts"
);
const RUNTIME_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/project-manager-runtime-session-view.tsx"
);
const STATUS_HYDRATOR_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/status-hydrator.ts"
);
const CORE_STREAM_TYPES_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/core-stream-message-types.ts"
);
const SESSION_ID_BAR_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/ui/src/session/session-id-bar.tsx"
);

test("project-manager-session-view keeps cross-workspace session-created focus guard", async () => {
  const source = await readFile(RUNTIME_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("const isInScope = isSessionInViewScope(session);"),
    true
  );
  assert.equal(
    source.includes(
      "const scopedActiveSessionId = isPreferredPending || visibleSessionsForView.some((session) => session.id === activeSessionId) ? activeSessionId : null;"
    ),
    true
  );
  assert.equal(
    source.includes(
      "const handleSendMessage = useSessionMessageSender(\n    sessionsRef,\n    workspacePath,\n    reload\n  );"
    ),
    true
  );
});

test("project-manager-runtime-session-view keeps detached session snapshots across unrelated core state", async () => {
  const runtimeSource = await readFile(RUNTIME_SOURCE_PATH, "utf8");
  const hydratorSource = await readFile(STATUS_HYDRATOR_SOURCE_PATH, "utf8");

  assert.equal(
    runtimeSource.includes("if (visibleSessionId && nextSessions.length === 0) {"),
    true
  );
  assert.equal(
    runtimeSource.includes("rehydrateOnCoreState: !visibleSessionId,"),
    true
  );
  assert.equal(
    hydratorSource.includes("readonly rehydrateOnCoreState?: boolean;"),
    true
  );
  assert.equal(
    hydratorSource.includes("params.rehydrateOnCoreState === false"),
    true
  );
});

test("project-manager-runtime-session-view keeps runtime and settings model sync hooks together", async () => {
  const source = await readFile(RUNTIME_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("useSettingsModelsSync(sessions, settings, setSnapshots);"),
    true
  );
  assert.equal(
    source.includes("useRuntimeModelSync(activeSessionId, setSnapshots);"),
    true
  );
  assert.equal(source.includes("api.refreshUsageLimits("), false);
  assert.equal(source.includes("onRefreshUsageLimits={"), false);
});

test("project-manager session surfaces keep binding-owned model labels wired", async () => {
  const runtimeSource = await readFile(RUNTIME_SOURCE_PATH, "utf8");
  const dialogControllerSource = await readFile(
    DIALOG_SESSION_CONTROLLER_SOURCE_PATH,
    "utf8"
  );
  const coreStreamTypesSource = await readFile(
    CORE_STREAM_TYPES_SOURCE_PATH,
    "utf8"
  );

  assert.equal(
    runtimeSource.includes("applySessionModelBindingToSnapshot("),
    true
  );
  assert.equal(
    dialogControllerSource.includes("applySessionModelBindingToSnapshot("),
    true
  );
  assert.equal(
    coreStreamTypesSource.includes('readonly type: "session:created";'),
    true
  );
  assert.equal(coreStreamTypesSource.includes("payload: SessionRecord"), true);
});

test("project-manager model switch callbacks dispatch through codex session command", async () => {
  const runtimeSource = await readFile(RUNTIME_SOURCE_PATH, "utf8");
  const dialogControllerSource = await readFile(
    DIALOG_SESSION_CONTROLLER_SOURCE_PATH,
    "utf8"
  );
  const dialogSource = await readFile(DIALOG_SOURCE_PATH, "utf8");

  assert.equal(
    runtimeSource.includes("api.requestCodexModelSwitch(sessionId, modelId)"),
    true
  );
  assert.equal(
    runtimeSource.includes(
      "api.requestCodexReasoningSwitch(sessionId, reasoning)"
    ),
    true
  );
  assert.equal(
    runtimeSource.includes("api.requestClaudeThinkingSwitch("),
    true
  );

  assert.equal(
    dialogControllerSource.includes(
      "api.requestCodexModelSwitch(currentSession.id, modelId)"
    ),
    true
  );
  assert.equal(
    dialogControllerSource.includes(
      "api.requestCodexReasoningSwitch(currentSession.id, reasoning)"
    ),
    true
  );
  assert.equal(
    dialogControllerSource.includes("api.requestClaudeThinkingSwitch("),
    true
  );

  assert.equal(
    dialogSource.includes("requestCodexModelSwitch(modelId)"),
    true
  );
  assert.equal(
    dialogSource.includes("requestCodexReasoningSwitch(reasoning)"),
    true
  );
});

test("project-manager-session-view restores dialog mode only from live PM intents", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(source.includes("window.localStorage"), false);
  assert.equal(source.includes("loadLastDialogIntent"), false);
  assert.equal(source.includes("saveLastDialogIntent"), false);
  assert.equal(source.includes("setDialogIntentOverride(null);"), true);
  assert.equal(source.includes("startupStage={startupStage}"), true);
  assert.equal(source.includes("initialDialogIntent"), true);
});

test("project-manager-session-view ignores stale dialog override outside startup stage", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("const isDialogIntentScopedToStartupStage = ("),
    true
  );
  assert.equal(
    source.includes('return !startupStage.startsWith("development_tree/");'),
    true
  );
  assert.equal(source.includes("return intent.stage === startupStage;"), true);
  assert.equal(
    source.includes("const scopedDialogIntentOverride = isDialogIntentScopedToStartupStage("),
    true
  );
  assert.equal(
    source.includes("const effectiveIntent = scopedDialogIntentOverride ?? initialDialogIntent;"),
    true
  );
  assert.equal(source.includes("const effectiveIntent = dialogIntentOverride ?? initialDialogIntent;"), false);
});

test("project-manager-session-view clears dialog override when selected startup stage changes", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  const clearEffectIndex = source.indexOf(
    "useEffect(() => {\n    setDialogIntentOverride(null);\n  }, [startupStage, workspacePath]);"
  );
  const legacyWorkspaceOnlyIndex = source.indexOf(
    "useEffect(() => {\n    setDialogIntentOverride(null);\n  }, [workspacePath]);"
  );
  assert.equal(clearEffectIndex >= 0, true);
  assert.equal(legacyWorkspaceOnlyIndex, -1);
});

test("project-manager-dialog-session-view keeps runtime model sync and dialog send wiring local", async () => {
  const source = await readFile(DIALOG_SOURCE_PATH, "utf8");
  const controllerSource = await readFile(
    DIALOG_SESSION_CONTROLLER_SOURCE_PATH,
    "utf8"
  );

  assert.equal(
    source.includes("useRuntimeModelSync(session?.id ?? null, setSnapshots);"),
    true
  );
  assert.equal(source.includes("api.refreshUsageLimits("), false);
  assert.equal(source.includes("onRefreshUsageLimits={"), false);
  assert.equal(
    source.includes(
      "onSendMessage={(_sessionId, content, turnOptions) =>"
    ),
    true
  );
  assert.equal(source.includes("sendMessage(content, turnOptions)"), true);
  assert.equal(controllerSource.includes("turnOptions?.managedReviewAction"), true);
  assert.equal(
    controllerSource.includes("api.dialogs.sendDialogMessage("),
    true
  );
  assert.equal(
    controllerSource.includes("intent.workspaceSlug, currentDialogId, content"),
    true
  );
  assert.equal(source.includes("activeSessionId={session.id}"), true);
});

test("project-manager-runtime-session-view does not seed empty state from browser-local dialog cache", async () => {
  const source = await readFile(RUNTIME_SOURCE_PATH, "utf8");

  assert.equal(source.includes("window.localStorage"), false);
  assert.equal(source.includes("loadLastDialogStage"), false);
  assert.equal(source.includes("setSessionScopeStage(startupStage);"), true);
  assert.equal(source.includes("visibleStage: sessionScopeStage"), true);
});

test("project-manager-runtime-session-view keeps session empty-state sync on live PM events only", async () => {
  const source = await readFile(RUNTIME_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes('window.addEventListener("pm:dialog:open", handleDialogIntent);'),
    true
  );
  assert.equal(
    source.includes('window.addEventListener("pm:stage:activated", handleStageActivated);'),
    true
  );
  assert.equal(
    source.includes("setSessionScopeStage((current) =>"),
    true
  );
  assert.equal(
    source.includes("setSessionScopeStage(stage);"),
    true
  );
});

test("project-manager-runtime-session-view rebuilds snapshots from fresh session state after workspace switch", async () => {
  const source = await readFile(RUNTIME_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("const nextSnapshots: SessionSnapshots = {};"),
    true
  );
  assert.equal(
    source.includes(
      "nextSnapshots[session.id] = seedSnapshotWithCachedUsageLimits("
    ),
    true
  );
  assert.equal(
    source.includes("createInitialSnapshot("),
    true
  );
  assert.equal(
    source.includes("applyWorkspaceSnapshotToSnapshots(nextSnapshots,"),
    true
  );
  assert.equal(
    source.includes("snapshotState.currentSnapshot?.workspaceRoot === workspacePath"),
    true
  );
});

test("project-manager-runtime-session-view hydrates canonical history instead of replaying optimistic dialog placeholders", async () => {
  const source = await readFile(RUNTIME_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("const normalized = normalizeSessionHistoryMessages(payload.messages);"),
    true
  );
  assert.equal(
    source.includes("loadedHistorySessionIdsRef.current.add(payload.sessionId);"),
    true
  );
  assert.equal(
    source.includes("mergeHistoryIntoSnapshots(previous, {"),
    true
  );
  assert.equal(
    source.includes("loadSessionHistories(config, [session], (payload) => {"),
    true
  );
  assert.equal(
    source.includes("if (loadedHistorySessionIdsRef.current.has(session.id)) {"),
    true
  );
});

test("project-manager-dialog-session-controller seeds materialized dialog snapshots from provider cache", async () => {
  const source = await readFile(DIALOG_SESSION_CONTROLLER_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("seedSnapshotWithCachedUsageLimits("),
    true
  );
  assert.equal(
    source.includes("existingCreatedSnapshot ??"),
    true
  );
  assert.equal(
    source.includes("createInitialSnapshot("),
    true
  );
});

test("project-manager-dialog-session-controller requests pre-turn usage refresh on explicit dialog open", async () => {
  const source = await readFile(DIALOG_CORE_EVENTS_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("api.refreshUsageLimits({"),
    true
  );
  assert.equal(
    source.includes('lifecycleTrigger: "dialog_opened"'),
    true
  );
  assert.equal(
    source.includes("providerSessionId: match.providerSessionId,"),
    true
  );
  assert.equal(
    source.includes("sessionId: nextSession.id,"),
    true
  );
});

test("session-id-bar stays display-only for usage limits after PM remount", async () => {
  const source = await readFile(SESSION_ID_BAR_SOURCE_PATH, "utf8");

  assert.equal(source.includes("useEffect"), false);
  assert.equal(source.includes("onRefreshUsageLimits({"), false);
  assert.equal(
    source.includes("const resolvedUsageLimits = status.usageLimits ?? null;"),
    true
  );
  assert.equal(
    source.includes(
      "status.usageLimitLabels ?? buildFallbackLabels(status, binding);"
    ),
    true
  );
});
