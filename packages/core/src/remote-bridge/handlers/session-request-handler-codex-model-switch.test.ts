import assert from "node:assert/strict";
import test from "node:test";
import { CODEX_MODEL_SWITCH_INJECTION_KEY } from "@codeai-hub/codex-app-server-module";
import {
  buildSessionModelBindingKey,
  type SessionModelBinding,
} from "../../session-model-binding";
import { RemoteBridgeMessageRouter } from "../remote-bridge-message-router";
import { createHarness, noop } from "./session-request-handler.test-helpers";

const MODEL_SWITCH_INSTRUCTION_PROFILE_PATTERN = /early architecture workflow/;

const createRouter = (
  harness: ReturnType<typeof createHarness>
): RemoteBridgeMessageRouter =>
  new RemoteBridgeMessageRouter({
    dialogHistoryService: {} as never,
    dialogListService: {} as never,
    dialogOpenService: {} as never,
    getManager: () => undefined,
    logger: { error: noop, info: noop, warn: noop } as never,
    nativeRequestCaptureFacade: {} as never,
    projectHandler: {} as never,
    sessionHandler: harness.handler,
    sessionManager: harness.sessionManager,
    settingsHandler: {} as never,
    workflowRuntime: {} as never,
    workspaceRuntime: {} as never,
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

test("Codex model switch command updates pending turn binding without sending provider message", async () => {
  const harness = createHarness();
  const router = createRouter(harness);
  const sendCalls: string[] = [];
  let adapterLookups = 0;
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
  harness.providerRegistry.getAdapter = () => {
    adapterLookups += 1;
    return {
      sendMessage: (_providerSessionId: string, content: string) => {
        sendCalls.push(content);
        return Promise.resolve();
      },
    };
  };

  await router.handleIncomingMessage("client-1", {
    type: "session:codex:model-switch",
    payload: {
      sessionId: session.id,
      targetModelId: "gpt-5.3-codex-spark",
      targetReasoningEffort: "xhigh",
    },
  });

  const updatedSession = harness.sessionManager.getSession(session.id);
  const updatedBinding = updatedSession?.modelBinding;

  assert.equal(updatedSession?.pendingModelSwitchInjection, true);
  assert.equal(adapterLookups, 0);
  assert.deepEqual(sendCalls, []);
  assert.equal(updatedBinding?.key, previousBinding.key);
  assert.equal(updatedBinding?.boundAt, previousBinding.boundAt);
  assert.equal(updatedBinding?.providerId, "codexCli");
  assert.equal(updatedBinding?.baseModelId, "gpt-5.3-codex-spark");
  assert.equal(updatedBinding?.modelId, "gpt-5.3-codex-spark reasoning:xhigh");
  assert.equal(updatedBinding?.reasoningEffort, "xhigh");
  assert.equal(updatedBinding?.source, "switch_request");
  assert.equal(
    Number.isNaN(Date.parse(updatedBinding?.updatedAt ?? "")),
    false
  );
  assert.notEqual(updatedBinding?.updatedAt, previousBinding.updatedAt);
  assert.deepEqual(harness.events, [
    {
      type: "session:model:update",
      payload: {
        sessionId: session.id,
        providerId: "codexCli",
        baseModelId: "gpt-5.3-codex-spark",
        modelId: "gpt-5.3-codex-spark reasoning:xhigh",
        modelBinding: updatedBinding,
        source: "switch_request",
      },
    },
  ]);
});

test("Codex model switch command rejects unknown models without mutating binding", async () => {
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
      targetReasoningEffort: "high",
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
