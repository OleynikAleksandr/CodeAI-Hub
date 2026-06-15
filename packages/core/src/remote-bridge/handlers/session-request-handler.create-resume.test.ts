import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildSessionFilePath,
  sanitizeWorkspaceSlug,
} from "@codeai-hub/unified-session";
import { WORKFLOW_UNIFIED_SESSION_WORKSPACE_SLUG } from "../../unified-session/storage";
import { resolveWorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";
import { readAppliedProviderTurnConfig } from "../types";
import {
  collectTurnStateSequence,
  createHarness,
  EXPECTED_HANDLER_SOURCE_INVARIANT_CHECKS,
  flushAsyncWork,
  getHandlerSourceInvariantChecks,
  internals,
  noop,
  SOURCE_PATH,
} from "./session-request-handler.test";

test("SessionRequestHandler routes provider lifecycle and preserves provider timestamps", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "codexCli",
    "/tmp/core-provider-lifecycle"
  );
  const persistedTimestamps: string[] = [];
  harness.sessionStorage.appendMessage = (
    _sessionId: unknown,
    message: unknown
  ) => {
    persistedTimestamps.push(
      (message as { readonly timestamp: string }).timestamp
    );
    return Promise.resolve();
  };

  internals(harness.handler).providerEventRouter.handleProviderEvent(
    session.id,
    {
      type: "turn_started",
    }
  );
  internals(harness.handler).providerEventRouter.handleProviderEvent(
    session.id,
    {
      type: "turn_completed",
    }
  );
  await flushAsyncWork();
  internals(harness.handler).providerEventRouter.handleProviderEvent(
    session.id,
    {
      type: "assistant",
      content: "Late provider commentary",
      timestamp: "2026-03-23T10:54:30.000Z",
    }
  );
  await flushAsyncWork();

  assert.deepEqual(collectTurnStateSequence(harness.events), [
    "running",
    "idle",
  ]);
  const lastMessage = harness.events
    .filter((event) => event.type === "session:message")
    .at(-1);
  assert.equal(
    (lastMessage?.payload as { readonly timestamp?: string }).timestamp,
    "2026-03-23T10:54:30.000Z"
  );
  assert.equal(persistedTimestamps.at(-1), "2026-03-23T10:54:30.000Z");
});

test("SessionRequestHandler keeps internal sends in provider turn lifecycle", async () => {
  for (const scenario of [
    {
      name: "success",
      adapter: { sendMessage: async () => Promise.resolve() },
      expected: ["running"],
    },
    {
      name: "failure",
      adapter: {
        sendMessage: () => {
          throw new Error("kaboom");
        },
      },
      expected: ["running", "idle", "idle"],
    },
  ]) {
    const harness = createHarness();
    const session = harness.sessionManager.createSession(
      "claudeCodeCli",
      `/tmp/core-internal-${scenario.name}`
    );
    harness.providerSessions.set(session.id, {
      providerId: "claudeCodeCli",
      providerSessionId: "temp_123",
      unsubscribe: noop,
    });
    harness.providerRegistry.getAdapter = () => scenario.adapter;

    await internals(harness.handler).sendInternalMessage(
      session.id,
      "INTERNAL"
    );
    assert.deepEqual(
      collectTurnStateSequence(harness.events),
      scenario.expected,
      scenario.name
    );
  }
});

test("SessionRequestHandler sends workspace context with every provider prompt", async () => {
  const harness = createHarness();
  const sentMessages: string[] = [];
  const session = harness.sessionManager.createSession(
    "codexCli",
    "/tmp/FinderWidget-Test01",
    "provider-workspace-context",
    {
      initiativeSlug: "finderwidget-test01",
      stage: "description",
    }
  );
  harness.providerSessions.set(session.id, {
    providerId: "codexCli",
    providerSessionId: "provider-workspace-context",
    unsubscribe: noop,
  });
  harness.providerRegistry.getAdapter = () => ({
    sendMessage: (_providerSessionId: string, content: string) => {
      sentMessages.push(content);
      return Promise.resolve();
    },
  });

  await harness.handler.handleMessage(
    session.id,
    "Read /tmp/FinderWidget-TestNotes/note.md and write the artifact."
  );
  await internals(harness.handler).sendInternalMessage(
    session.id,
    "Repair the missing artifact."
  );

  assert.equal(sentMessages.length, 2);
  for (const content of sentMessages) {
    assert.equal(content.startsWith("## CodeAI Hub Workspace Context"), true);
    assert.equal(
      content.includes("Workspace name: `FinderWidget-Test01`"),
      true
    );
    assert.equal(
      content.includes("Workspace slug: `finderwidget-test01`"),
      true
    );
    assert.equal(content.includes("Workflow stage: `description`"), true);
    assert.equal(
      content.includes("Workspace root: `/tmp/FinderWidget-Test01`"),
      true
    );
    assert.equal(
      content.includes("relative `.codeai-hub/...` workflow artifact paths"),
      true
    );
    assert.equal(
      content.includes("External absolute paths in user materials"),
      true
    );
  }
  assert.equal(
    (sentMessages[0] ?? "").includes("/tmp/FinderWidget-TestNotes/note.md"),
    true
  );
  assert.equal(
    (sentMessages[1] ?? "").includes("Repair the missing artifact"),
    true
  );
  assert.equal(
    session.messages.at(-1)?.content,
    "Read /tmp/FinderWidget-TestNotes/note.md and write the artifact."
  );
});

test("SessionRequestHandler routes switch_model through session model binding", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "codexCli",
    "/tmp/core-switch-model-binding"
  );
  const sentTurnOptions: Array<Record<string, unknown> | undefined> = [];
  const overrides: string[] = [];
  harness.sessionManager.appendMessage(session.id, "user", "retry this prompt");
  harness.providerSessions.set(session.id, {
    providerId: "codexCli",
    providerSessionId: "provider-session-switch",
    unsubscribe: noop,
  });
  harness.providerRegistry.getAdapter = () => ({
    setModelOverride: (modelId: string) => {
      overrides.push(modelId);
    },
    sendMessage: (
      _providerSessionId: string,
      _content: string,
      turnOptions?: Record<string, unknown>
    ) => {
      sentTurnOptions.push(turnOptions);
      return Promise.resolve();
    },
  });

  await harness.handler.handleSwitchRequest({
    sessionId: session.id,
    mode: "switch_model",
    targetModelId: "gpt-5.4-mini",
  });

  assert.deepEqual(overrides, ["gpt-5.4-mini"]);
  assert.equal(session.modelBinding?.source, "switch_request");
  assert.equal(session.modelBinding?.baseModelId, "gpt-5.4-mini");
  assert.equal(session.modelBinding?.modelId, "gpt-5.4-mini reasoning:medium");
  assert.equal(
    readAppliedProviderTurnConfig(sentTurnOptions[0])?.effectiveModelId,
    "gpt-5.4-mini reasoning:medium"
  );
});

test("SessionRequestHandler updates provider binding on sessionIdChanged", () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-binding"
  );
  harness.providerSessions.set(session.id, {
    providerId: "claudeCodeCli",
    providerSessionId: "temp_123",
    unsubscribe: noop,
  });

  internals(harness.handler).providerEventRouter.handleProviderEvent(
    session.id,
    {
      type: "sessionIdChanged",
      payload: { newId: "real-session-123" },
    }
  );

  const updatedSession = harness.sessionManager.getSession(session.id);
  assert.equal(updatedSession?.providerSessionId, "real-session-123");
  assert.equal(updatedSession?.providerSessionStatus, "ready");
  assert.equal(
    harness.providerSessions.get(session.id)?.providerSessionId,
    "real-session-123"
  );
  assert.deepEqual(harness.promoted, [
    { sessionId: session.id, providerSessionId: "real-session-123" },
  ]);
  assert.deepEqual(harness.continuityUpdates, [
    { sessionId: session.id, providerSessionId: "real-session-123" },
  ]);
});

test("SessionRequestHandler eagerly tracks freshly bound provider sessions", async () => {
  const harness = createHarness();
  internals(harness.handler).resolveContinuityRootSessionId = async ({
    sessionId,
  }: {
    readonly sessionId: string;
  }) => `root-${sessionId}`;
  Object.assign(internals(harness.handler).descriptionDialogSync, {
    resolveDescriptionDialog: async () => null,
    maybePromoteLegacyDescriptionDialogHistory: noop,
    maybeBackfillDescriptionDialogHistory: async () => Promise.resolve(),
    updateDescriptionSessionRef: async () => Promise.resolve(),
  });

  const factory = internals(harness.handler).sessionShellFactory;
  const createOptions = {
    providerId: "codex",
    workspacePath: "/tmp/core-continuity-created",
    adapter: { subscribe: () => noop },
    silent: true,
    context: {
      initiativeSlug: "demo",
      stage: "diagram_modules",
      runSlug: null,
      providerSessionId: null,
    },
  };

  const createdSession = await factory.createBoundSession(
    createOptions,
    "provider-created-1",
    true
  );
  const shell = await factory.createShellSession(createOptions);
  await factory.bindShellSession(
    createOptions,
    shell,
    "provider-shell-2",
    true
  );

  assert.deepEqual(harness.continuityTracked, [
    {
      sessionId: createdSession.id,
      providerSessionId: "provider-created-1",
    },
    {
      sessionId: shell.session.id,
      providerSessionId: "provider-shell-2",
    },
  ]);
});

test("SessionRequestHandler keeps outbound sends in running and rollback contract", async () => {
  const success = createHarness();
  const successSession = success.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-immediate-running"
  );
  let resolveSend: () => void = noop;
  const sendCalls: string[] = [];
  const sendPromise = new Promise<void>((resolve) => {
    resolveSend = resolve;
  });
  success.providerRegistry.getAdapter = () => ({
    sendMessage: (_providerSessionId: string, content: string) => {
      sendCalls.push(content);
      return sendPromise;
    },
  });
  success.providerSessions.set(successSession.id, {
    providerId: "claudeCodeCli",
    providerSessionId: "provider-session-3",
    unsubscribe: noop,
  });

  const pendingSend = success.handler.handleMessage(successSession.id, "hello");
  await flushAsyncWork();
  assert.deepEqual(collectTurnStateSequence(success.events), ["running"]);
  assert.equal(sendCalls.length, 1);
  assert.equal(
    (sendCalls[0] ?? "").startsWith("## CodeAI Hub Workspace Context"),
    true
  );
  assert.equal(
    (sendCalls[0] ?? "").includes(
      "Workspace root: `/tmp/core-immediate-running`"
    ),
    true
  );
  assert.equal((sendCalls[0] ?? "").includes("hello"), true);
  resolveSend();
  await pendingSend;

  const failure = createHarness();
  const failureSession = failure.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-running-rollback"
  );
  failure.providerRegistry.getAdapter = () => ({
    sendMessage: () => Promise.reject(new Error("simulated send failure")),
  });
  failure.providerSessions.set(failureSession.id, {
    providerId: "claudeCodeCli",
    providerSessionId: "provider-session-4",
    unsubscribe: noop,
  });

  await failure.handler.handleMessage(failureSession.id, "rollback me");
  assert.deepEqual(collectTurnStateSequence(failure.events), [
    "running",
    "idle",
    "idle",
  ]);
});

test("SessionRequestHandler keeps primary description dialog contracts", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-description-session-ref",
    "provider-session-current",
    {
      initiativeSlug: "description-workspace",
      stage: "description",
      runSlug: null,
    }
  );
  let capturedUpdate: Record<string, unknown> | null = null;
  internals(harness.handler).descriptionDialogSync.descriptionStepStore = {
    read: async () => ({
      primarySession: {
        providerId: "claudeCodeCli",
        providerSessionId: "provider-session-primary",
        jsonlPath: "/tmp/primary-session.jsonl",
        dialogSessionId: "primary-description-dialog",
      },
      session: {
        providerId: "claudeCodeCli",
        providerSessionId: "provider-session-legacy",
        jsonlPath: "/tmp/legacy-session.jsonl",
        dialogSessionId: "legacy-description-dialog",
      },
    }),
    upsert: (
      _workspacePath: string,
      _workspaceSlug: string,
      update: Record<string, unknown>
    ) => {
      capturedUpdate = update;
      return Promise.resolve({});
    },
  };

  const dialog = await internals(
    harness.handler
  ).descriptionDialogSync.resolveDescriptionDialog({
    session,
    providerSessionId: "provider-session-current",
  });
  assert.equal(dialog?.dialogSessionId, "primary-description-dialog");
  assert.equal(dialog?.shouldBackfill, false);

  await internals(
    harness.handler
  ).descriptionDialogSync.updateDescriptionSessionRef(
    session,
    "provider-session-updated"
  );
  assert.deepEqual(Object.keys(capturedUpdate ?? {}).sort(), [
    "primarySession",
  ]);
  const primarySession = (
    capturedUpdate as {
      readonly primarySession?: {
        readonly jsonlPath?: string;
        readonly providerSessionId?: string;
      };
    } | null
  )?.primarySession;
  const expectedJsonlPath = buildSessionFilePath({
    rootDirectory: resolveWorkspaceRuntimeCapsule({
      workspaceRoot: session.workspacePath,
      workspaceSlug: "description-workspace",
    }).sessionsRoot.absolutePath,
    workspaceSlug: WORKFLOW_UNIFIED_SESSION_WORKSPACE_SLUG,
    provider: session.providerId,
    sessionId: sanitizeWorkspaceSlug(session.id),
  });
  assert.equal(primarySession?.providerSessionId, "provider-session-updated");
  assert.equal(primarySession?.jsonlPath, expectedJsonlPath);
  const source = await readFile(SOURCE_PATH, "utf8");
  assert.deepEqual(
    getHandlerSourceInvariantChecks(source),
    EXPECTED_HANDLER_SOURCE_INVARIANT_CHECKS
  );
});
