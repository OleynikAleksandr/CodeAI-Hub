import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { CODEX_MODEL_SWITCH_INJECTION_KEY } from "@codeai-hub/codex-app-server-module";
import { ContinuityChainStore } from "../../session-continuity/continuity-store";
import {
  buildSessionModelBindingKey,
  type SessionModelBinding,
} from "../../session-model-binding";
import { RemoteBridgeMessageRouter } from "../remote-bridge-message-router";
import { readAppliedProviderTurnConfig } from "../types";
import { createHarness, noop } from "./session-request-handler.test-helpers";

const MODEL_SWITCH_INSTRUCTION_PROFILE_PATTERN = /early architecture workflow/;

const createRouter = (
  harness: ReturnType<typeof createHarness>,
  getManager: () => unknown = () => undefined
): RemoteBridgeMessageRouter =>
  new RemoteBridgeMessageRouter({
    dialogHistoryService: {} as never,
    dialogListService: {} as never,
    dialogOpenService: {} as never,
    getManager: getManager as never,
    logger: { error: noop, info: noop, warn: noop } as never,
    nativeRequestCaptureFacade: {} as never,
    projectHandler: {} as never,
    sessionHandler: harness.handler,
    sessionManager: harness.sessionManager,
    settingsHandler: {} as never,
    workflowRuntime: {} as never,
    workspaceRuntime: {} as never,
  });

test("Codex model switch remains authoritative across dialog send resume", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "codex-dialog-model-switch-")
  );
  try {
    await writeFile(
      path.join(workspaceRoot, "settings.json"),
      '{"providers":{"codex":{"defaultModel":"gpt-5.2","reasoningByModel":{"gpt-5.2":"low"}}}}\n',
      "utf8"
    );
    const harness = createHarness({
      claudeSettingsPath: path.join(workspaceRoot, "claude-settings.json"),
    });
    const workspaceSlug = "workspace";
    const dialogId = "dialog-codex-switch";
    const session = harness.sessionManager.createSession(
      "codexCli",
      workspaceRoot,
      "provider-session-codex",
      {
        initiativeSlug: workspaceSlug,
        stage: "description",
        runSlug: null,
      }
    );
    const previousBinding = createPreviousBinding(session.id, workspaceRoot);
    harness.sessionManager.setModelBinding(session.id, previousBinding);
    await new ContinuityChainStore({
      workspaceRoot,
      workspaceSlug,
      rootSessionId: dialogId,
      stage: "description",
      clock: () => "2026-04-30T06:00:00.000Z",
    }).appendSegment({
      sessionId: session.id,
      providerId: "codexCli",
      providerSessionId: "provider-session-codex",
      modelBinding: previousBinding,
      createdAt: "2026-04-30T06:00:00.000Z",
    });
    harness.providerSessions.set(session.id, {
      providerId: "codexCli",
      providerSessionId: "provider-session-codex",
      unsubscribe: noop,
    });
    const sentTurnOptions: Array<Record<string, unknown> | undefined> = [];
    harness.providerRegistry.getAdapter = () => ({
      sendMessage: (
        _providerSessionId: string,
        _content: string,
        turnOptions?: Record<string, unknown>
      ) => {
        sentTurnOptions.push(turnOptions);
        return Promise.resolve();
      },
    });
    const clientMessages: unknown[] = [];
    const router = createRouter(harness, () => ({
      getWorkspaceScope: () => ({
        enabled: true,
        workspacePath: workspaceRoot,
      }),
      sendToClient: (_clientId: string, message: unknown) => {
        clientMessages.push(message);
      },
    }));

    await router.handleIncomingMessage("client-1", {
      type: "session:codex:model-switch",
      payload: {
        sessionId: session.id,
        targetModelId: "gpt-5.3-codex-spark",
      },
    });
    await router.handleIncomingMessage("client-1", {
      type: "dialog:send",
      payload: {
        requestId: "request-dialog-send",
        workspaceSlug,
        dialogId,
        content: "next dialog answer",
      },
    });

    const turnConfig = readAppliedProviderTurnConfig(sentTurnOptions[0]);
    const injection = sentTurnOptions[0]?.[CODEX_MODEL_SWITCH_INJECTION_KEY] as
      | Record<string, unknown>
      | undefined;
    assert.equal(turnConfig?.baseModelId, "gpt-5.3-codex-spark");
    assert.equal(
      turnConfig?.effectiveModelId,
      "gpt-5.3-codex-spark reasoning:low"
    );
    assert.equal(turnConfig?.reasoningEffort, "low");
    assert.equal(turnConfig?.source, "session_binding");
    assert.equal(injection?.kind, "model_switch");
    assert.equal(injection?.targetModelId, "gpt-5.3-codex-spark");
    assert.equal(injection?.targetReasoningEffort, "low");
    assert.equal(
      harness.sessionManager.getSession(session.id)
        ?.pendingModelSwitchInjection,
      false
    );
    assert.deepEqual(clientMessages.at(-1), {
      type: "dialog:send:ack",
      payload: {
        requestId: "request-dialog-send",
        workspaceSlug,
        dialogId,
        status: "sent",
        error: null,
      },
    });
    assert.equal(
      harness.events.some(
        (event) =>
          event.type === "session:model:update" &&
          event.payload.modelId === "gpt-5.3-codex-spark reasoning:low"
      ),
      true
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("dialog send hydrates contextless restored Codex runtime sessions", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "codex-dialog-context-hydration-")
  );
  try {
    const harness = createHarness({
      claudeSettingsPath: path.join(workspaceRoot, "claude-settings.json"),
    });
    const workspaceSlug = "workflow-context";
    const dialogId = "dialog-virtual-simulation";
    const session = harness.sessionManager.createSession(
      "codexCli",
      workspaceRoot,
      "provider-session-contextless"
    );
    await new ContinuityChainStore({
      workspaceRoot,
      workspaceSlug,
      rootSessionId: dialogId,
      stage: "virtual_simulation",
      clock: () => "2026-05-03T07:30:00.000Z",
    }).appendSegment({
      sessionId: session.id,
      providerId: "codexCli",
      providerSessionId: "provider-session-contextless",
      createdAt: "2026-05-03T07:30:00.000Z",
    });
    harness.providerSessions.set(session.id, {
      providerId: "codexCli",
      providerSessionId: "provider-session-contextless",
      unsubscribe: noop,
    });
    const sentMessages: string[] = [];
    harness.providerRegistry.getAdapter = () => ({
      sendMessage: (_providerSessionId: string, content: string) => {
        sentMessages.push(content);
        return Promise.resolve();
      },
    });
    const clientMessages: unknown[] = [];
    const router = createRouter(harness, () => ({
      getWorkspaceScope: () => ({
        enabled: true,
        workspacePath: workspaceRoot,
      }),
      sendToClient: (_clientId: string, message: unknown) => {
        clientMessages.push(message);
      },
    }));

    await router.handleIncomingMessage("client-1", {
      type: "dialog:send",
      payload: {
        requestId: "request-dialog-send",
        workspaceSlug,
        dialogId,
        content: "continue virtual simulation",
      },
    });
    const hydratedSession = harness.sessionManager.getSession(session.id);
    assert.equal(hydratedSession?.initiativeSlug, workspaceSlug);
    assert.equal(hydratedSession?.stage, "virtual_simulation");
    assert.equal(hydratedSession?.runSlug, null);
    assert.equal(sentMessages.length, 1);
    assert.deepEqual(clientMessages.at(-1), {
      type: "dialog:send:ack",
      payload: {
        requestId: "request-dialog-send",
        workspaceSlug,
        dialogId,
        status: "sent",
        error: null,
      },
    });
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("dialog send can target scoped worktree dialogs with turn options", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "codex-dialog-worktree-send-")
  );
  try {
    const worktreeRoot = path.join(`${workspaceRoot}.worktrees`, "cluster");
    await mkdir(worktreeRoot, { recursive: true });
    const harness = createHarness({
      claudeSettingsPath: path.join(workspaceRoot, "claude-settings.json"),
    });
    const workspaceSlug = "finderwidget-test01";
    const dialogId = "dialog-note-selection-cluster";
    const session = harness.sessionManager.createSession(
      "codexCli",
      worktreeRoot,
      "provider-session-worktree"
    );
    await new ContinuityChainStore({
      workspaceRoot: worktreeRoot,
      workspaceSlug,
      rootSessionId: dialogId,
      stage: "cluster_contract",
      clock: () => "2026-06-09T08:30:00.000Z",
    }).appendSegment({
      sessionId: session.id,
      providerId: "codexCli",
      providerSessionId: "provider-session-worktree",
      createdAt: "2026-06-09T08:30:00.000Z",
    });
    harness.providerSessions.set(session.id, {
      providerId: "codexCli",
      providerSessionId: "provider-session-worktree",
      unsubscribe: noop,
    });
    const sentTurnOptions: Array<Record<string, unknown> | undefined> = [];
    harness.providerRegistry.getAdapter = () => ({
      sendMessage: (
        _providerSessionId: string,
        _content: string,
        turnOptions?: Record<string, unknown>
      ) => {
        sentTurnOptions.push(turnOptions);
        return Promise.resolve();
      },
    });
    const clientMessages: unknown[] = [];
    const router = createRouter(harness, () => ({
      getWorkspaceScope: () => ({
        enabled: true,
        workspacePath: workspaceRoot,
      }),
      sendToClient: (_clientId: string, message: unknown) => {
        clientMessages.push(message);
      },
    }));

    await router.handleIncomingMessage("client-1", {
      type: "dialog:send",
      payload: {
        requestId: "request-worktree-dialog-send",
        workspacePath: worktreeRoot,
        workspaceSlug,
        dialogId,
        content: "confirm from projected cluster",
        turnOptions: { projectedDialogAction: { type: "confirm" } },
      },
    });

    assert.deepEqual(sentTurnOptions[0]?.projectedDialogAction, {
      type: "confirm",
    });
    assert.deepEqual(clientMessages.at(-1), {
      type: "dialog:send:ack",
      payload: {
        requestId: "request-worktree-dialog-send",
        workspaceSlug,
        dialogId,
        status: "sent",
        error: null,
      },
    });
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
    await rm(`${workspaceRoot}.worktrees`, { force: true, recursive: true });
  }
});

const createPreviousBinding = (
  sessionId: string,
  workspacePath: string
): SessionModelBinding => ({
  key: buildSessionModelBindingKey({
    providerId: "codexCli",
    sessionId,
    workspacePath,
  }),
  providerId: "codexCli",
  baseModelId: "gpt-5.2",
  modelId: "gpt-5.2 reasoning:low",
  reasoningEffort: "low",
  source: "start_step_selection",
  boundAt: "2026-04-30T06:00:00.000Z",
  updatedAt: "2026-04-30T06:00:00.000Z",
});

test("Codex model-only switch swaps base model and preserves prior reasoning effort", async () => {
  const harness = createHarness();
  const router = createRouter(harness);
  const session = harness.sessionManager.createSession(
    "codexCli",
    "/tmp/codex-model-switch",
    "provider-session-codex"
  );
  const previousBinding = createPreviousBinding(
    session.id,
    session.workspacePath
  );
  harness.sessionManager.setModelBinding(session.id, previousBinding);

  await router.handleIncomingMessage("client-1", {
    type: "session:codex:model-switch",
    payload: {
      sessionId: session.id,
      targetModelId: "gpt-5.3-codex-spark",
    },
  });

  const updatedSession = harness.sessionManager.getSession(session.id);
  const updatedBinding = updatedSession?.modelBinding;
  assert.equal(updatedSession?.pendingModelSwitchInjection, true);
  assert.equal(updatedBinding?.baseModelId, "gpt-5.3-codex-spark");
  assert.equal(updatedBinding?.reasoningEffort, "low");
  assert.equal(updatedBinding?.modelId, "gpt-5.3-codex-spark reasoning:low");
  assert.equal(updatedBinding?.source, "switch_request");
  assert.equal(updatedBinding?.boundAt, previousBinding.boundAt);
});

test("Codex model-only switch rejects unknown models without mutating binding", async () => {
  const harness = createHarness();
  const router = createRouter(harness);
  const session = harness.sessionManager.createSession(
    "codexCli",
    "/tmp/codex-model-switch-invalid",
    "provider-session-codex"
  );
  const previousBinding = createPreviousBinding(
    session.id,
    session.workspacePath
  );
  harness.sessionManager.setModelBinding(session.id, previousBinding);

  await router.handleIncomingMessage("client-1", {
    type: "session:codex:model-switch",
    payload: {
      sessionId: session.id,
      targetModelId: "missing-codex-model",
    },
  });

  const updatedSession = harness.sessionManager.getSession(session.id);
  assert.deepEqual(updatedSession?.modelBinding, previousBinding);
  assert.equal(updatedSession?.pendingModelSwitchInjection, undefined);
  assert.deepEqual(harness.events, []);
});

test("pending Codex model switch injection is bridged once after successful send", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "codexCli",
    "/tmp/codex-model-switch-injection",
    "provider-session-codex"
  );
  const sentTurnOptions: Array<Record<string, unknown> | undefined> = [];
  harness.sessionManager.setModelBinding(session.id, {
    ...createPreviousBinding(session.id, session.workspacePath),
    baseModelId: "gpt-5.3-codex-spark",
    modelId: "gpt-5.3-codex-spark reasoning:xhigh",
    reasoningEffort: "xhigh",
    source: "switch_request",
  });
  session.pendingModelSwitchInjection = true;
  harness.providerSessions.set(session.id, {
    providerId: "codexCli",
    providerSessionId: "provider-session-codex",
    unsubscribe: noop,
  });
  harness.providerRegistry.getAdapter = () => ({
    sendMessage: (
      _providerSessionId: string,
      _content: string,
      turnOptions?: Record<string, unknown>
    ) => {
      sentTurnOptions.push(turnOptions);
      return Promise.resolve();
    },
  });

  await harness.handler.handleMessage(session.id, "next user turn");

  const injection = sentTurnOptions[0]?.[CODEX_MODEL_SWITCH_INJECTION_KEY] as
    | Record<string, unknown>
    | undefined;
  assert.equal(injection?.kind, "model_switch");
  assert.equal(injection?.targetModelId, "gpt-5.3-codex-spark");
  assert.equal(injection?.targetReasoningEffort, "xhigh");
  assert.match(
    String(injection?.baseInstructions),
    MODEL_SWITCH_INSTRUCTION_PROFILE_PATTERN
  );
  assert.equal(
    harness.sessionManager.getSession(session.id)?.pendingModelSwitchInjection,
    false
  );
});

test("pending Codex model switch injection is retained when provider send fails", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "codexCli",
    "/tmp/codex-model-switch-injection-fail",
    "provider-session-codex"
  );
  const sentTurnOptions: Array<Record<string, unknown> | undefined> = [];
  harness.sessionManager.setModelBinding(session.id, {
    ...createPreviousBinding(session.id, session.workspacePath),
    baseModelId: "gpt-5.3-codex-spark",
    modelId: "gpt-5.3-codex-spark reasoning:xhigh",
    reasoningEffort: "xhigh",
    source: "switch_request",
  });
  session.pendingModelSwitchInjection = true;
  harness.providerSessions.set(session.id, {
    providerId: "codexCli",
    providerSessionId: "provider-session-codex",
    unsubscribe: noop,
  });
  harness.providerRegistry.getAdapter = () => ({
    sendMessage: (
      _providerSessionId: string,
      _content: string,
      turnOptions?: Record<string, unknown>
    ) => {
      sentTurnOptions.push(turnOptions);
      return Promise.reject(new Error("simulated provider failure"));
    },
  });

  await harness.handler.handleMessage(session.id, "next user turn");

  assert.equal(
    sentTurnOptions[0]?.[CODEX_MODEL_SWITCH_INJECTION_KEY] !== undefined,
    true
  );
  assert.equal(
    harness.sessionManager.getSession(session.id)?.pendingModelSwitchInjection,
    true
  );
});
