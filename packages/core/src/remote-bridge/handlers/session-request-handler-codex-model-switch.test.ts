import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSessionModelBindingKey,
  type SessionModelBinding,
} from "../../session-model-binding";
import { RemoteBridgeMessageRouter } from "../remote-bridge-message-router";
import { createHarness, noop } from "./session-request-handler.test-helpers";

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
