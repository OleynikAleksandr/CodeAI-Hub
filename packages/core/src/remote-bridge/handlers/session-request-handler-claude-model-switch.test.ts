import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSessionModelBindingKey,
  type SessionModelBinding,
} from "../../session-model-binding";
import { RemoteBridgeMessageRouter } from "../remote-bridge-message-router";
import { createHarness, noop } from "./session-request-handler.test-helpers";

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

const createPreviousBinding = (
  sessionId: string,
  workspacePath: string
): SessionModelBinding => ({
  key: buildSessionModelBindingKey({
    providerId: "claudeCodeCli",
    sessionId,
    workspacePath,
  }),
  providerId: "claudeCodeCli",
  baseModelId: "sonnet",
  modelId: "sonnet reasoning:high",
  reasoningEffort: "high",
  thinkingEnabled: true,
  source: "start_step_selection",
  boundAt: "2026-05-01T06:00:00.000Z",
  updatedAt: "2026-05-01T06:00:00.000Z",
});

test("Claude model switch command updates binding without sending provider message", async () => {
  const harness = createHarness();
  const router = createRouter(harness);
  const sendCalls: string[] = [];
  let adapterLookups = 0;
  const session = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/claude-model-switch",
    "provider-session-claude"
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
    type: "session:claude:model-switch",
    payload: {
      sessionId: session.id,
      targetModelId: "opus",
      targetReasoningEffort: "xhigh",
      thinkingEnabled: true,
    },
  });

  const updatedSession = harness.sessionManager.getSession(session.id);
  const updatedBinding = updatedSession?.modelBinding;

  assert.equal(updatedSession?.pendingModelSwitchInjection, undefined);
  assert.equal(adapterLookups, 0);
  assert.deepEqual(sendCalls, []);
  assert.equal(updatedBinding?.key, previousBinding.key);
  assert.equal(updatedBinding?.boundAt, previousBinding.boundAt);
  assert.equal(updatedBinding?.providerId, "claudeCodeCli");
  assert.equal(updatedBinding?.baseModelId, "opus");
  assert.equal(updatedBinding?.modelId, "opus reasoning:xhigh");
  assert.equal(updatedBinding?.reasoningEffort, "xhigh");
  assert.equal(updatedBinding?.thinkingEnabled, true);
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
        providerId: "claudeCodeCli",
        baseModelId: "opus",
        modelId: "opus reasoning:xhigh",
        modelBinding: updatedBinding,
        source: "switch_request",
      },
    },
  ]);
});

test("Claude model switch command maps thinking off without retaining effort", async () => {
  const harness = createHarness();
  const router = createRouter(harness);
  const session = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/claude-model-switch-off",
    "provider-session-claude"
  );
  harness.sessionManager.setModelBinding(
    session.id,
    createPreviousBinding(session.id, session.workspacePath)
  );

  await router.handleIncomingMessage("client-1", {
    type: "session:claude:model-switch",
    payload: {
      sessionId: session.id,
      targetModelId: "haiku",
      targetReasoningEffort: "max",
      thinkingEnabled: false,
    },
  });

  const updatedBinding = harness.sessionManager.getSession(
    session.id
  )?.modelBinding;
  assert.equal(updatedBinding?.baseModelId, "haiku");
  assert.equal(updatedBinding?.modelId, "haiku thinking:off");
  assert.equal(updatedBinding?.reasoningEffort, undefined);
  assert.equal(updatedBinding?.thinkingEnabled, false);
});

test("Claude model switch command rejects unknown models without mutating binding", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/claude-model-switch-invalid",
    "provider-session-claude"
  );
  const previousBinding = createPreviousBinding(
    session.id,
    session.workspacePath
  );
  harness.sessionManager.setModelBinding(session.id, previousBinding);

  await harness.handler.handleClaudeModelSwitch({
    sessionId: session.id,
    targetModelId: "missing-claude-model" as never,
    targetReasoningEffort: "high",
    thinkingEnabled: true,
  });

  const updatedSession = harness.sessionManager.getSession(session.id);
  assert.deepEqual(updatedSession?.modelBinding, previousBinding);
  assert.equal(updatedSession?.pendingModelSwitchInjection, undefined);
  assert.deepEqual(harness.events, []);
});

test("Claude model switch command ignores non-Claude sessions", async () => {
  const harness = createHarness();
  const router = createRouter(harness);
  const session = harness.sessionManager.createSession(
    "codexCli",
    "/tmp/claude-model-switch-non-claude",
    "provider-session-codex"
  );

  await router.handleIncomingMessage("client-1", {
    type: "session:claude:model-switch",
    payload: {
      sessionId: session.id,
      targetModelId: "sonnet",
      targetReasoningEffort: "medium",
      thinkingEnabled: true,
    },
  });

  assert.equal(
    harness.sessionManager.getSession(session.id)?.modelBinding,
    undefined
  );
  assert.deepEqual(harness.events, []);
});
