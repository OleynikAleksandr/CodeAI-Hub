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
    getManager: (() => undefined) as never,
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

test("Codex reasoning-switch updates effort and preserves base model", async () => {
  const harness = createHarness();
  const router = createRouter(harness);
  const session = harness.sessionManager.createSession(
    "codexCli",
    "/tmp/codex-reasoning-switch",
    "provider-session-codex"
  );
  harness.sessionManager.setModelBinding(
    session.id,
    createPreviousBinding(session.id, session.workspacePath)
  );

  await router.handleIncomingMessage("client-1", {
    type: "session:codex:reasoning-switch",
    payload: {
      sessionId: session.id,
      targetReasoningEffort: "xhigh",
    },
  });

  const updatedSession = harness.sessionManager.getSession(session.id);
  const updatedBinding = updatedSession?.modelBinding;
  assert.equal(updatedBinding?.baseModelId, "gpt-5.2");
  assert.equal(updatedBinding?.reasoningEffort, "xhigh");
  assert.equal(updatedBinding?.modelId, "gpt-5.2 reasoning:xhigh");
  assert.equal(updatedSession?.pendingModelSwitchInjection, true);
});

test("Codex reasoning-switch rejects unsupported effort without mutating binding", async () => {
  const harness = createHarness();
  const router = createRouter(harness);
  const session = harness.sessionManager.createSession(
    "codexCli",
    "/tmp/codex-reasoning-switch-invalid",
    "provider-session-codex"
  );
  const previousBinding = createPreviousBinding(
    session.id,
    session.workspacePath
  );
  harness.sessionManager.setModelBinding(session.id, previousBinding);

  await router.handleIncomingMessage("client-1", {
    type: "session:codex:reasoning-switch",
    payload: {
      sessionId: session.id,
      targetReasoningEffort: "max" as never,
    },
  });

  const updatedSession = harness.sessionManager.getSession(session.id);
  assert.deepEqual(updatedSession?.modelBinding, previousBinding);
  assert.notEqual(updatedSession?.pendingModelSwitchInjection, true);
});

test("Codex reasoning-switch ignores non-Codex sessions", async () => {
  const harness = createHarness();
  const router = createRouter(harness);
  const session = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/codex-reasoning-switch-non-codex",
    "provider-session-claude"
  );

  await router.handleIncomingMessage("client-1", {
    type: "session:codex:reasoning-switch",
    payload: {
      sessionId: session.id,
      targetReasoningEffort: "high",
    },
  });

  assert.equal(
    harness.sessionManager.getSession(session.id)?.modelBinding,
    undefined
  );
  assert.deepEqual(harness.events, []);
});
