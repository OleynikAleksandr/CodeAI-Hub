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

test("Claude model-only switch swaps base model and preserves prior thinking effort", async () => {
  const harness = createHarness();
  const router = createRouter(harness);
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

  await router.handleIncomingMessage("client-1", {
    type: "session:claude:model-switch",
    payload: {
      sessionId: session.id,
      targetModelId: "opus",
    },
  });

  const updatedBinding = harness.sessionManager.getSession(
    session.id
  )?.modelBinding;
  assert.equal(updatedBinding?.baseModelId, "opus");
  assert.equal(updatedBinding?.reasoningEffort, "high");
  assert.equal(updatedBinding?.thinkingEnabled, true);
  assert.equal(updatedBinding?.modelId, "opus reasoning:high");
  assert.equal(updatedBinding?.source, "switch_request");
  assert.equal(updatedBinding?.boundAt, previousBinding.boundAt);
  assert.notEqual(updatedBinding?.updatedAt, previousBinding.updatedAt);
});

test("Claude model-only switch keeps existing effort when new model supports it", async () => {
  const harness = createHarness();
  const router = createRouter(harness);
  const session = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/claude-model-switch-keep-effort",
    "provider-session-claude"
  );
  harness.sessionManager.setModelBinding(session.id, {
    ...createPreviousBinding(session.id, session.workspacePath),
    baseModelId: "opus",
    modelId: "opus reasoning:xhigh",
    reasoningEffort: "xhigh",
  });

  await router.handleIncomingMessage("client-1", {
    type: "session:claude:model-switch",
    payload: {
      sessionId: session.id,
      targetModelId: "haiku",
    },
  });

  const updatedBinding = harness.sessionManager.getSession(
    session.id
  )?.modelBinding;
  assert.equal(updatedBinding?.baseModelId, "haiku");
  assert.equal(updatedBinding?.thinkingEnabled, true);
  assert.equal(updatedBinding?.reasoningEffort, "xhigh");
});

test("Claude model-only switch rejects unknown models without mutating binding", async () => {
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
  });

  assert.deepEqual(
    harness.sessionManager.getSession(session.id)?.modelBinding,
    previousBinding
  );
  assert.deepEqual(harness.events, []);
});

test("Claude model-only switch ignores non-Claude sessions", async () => {
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
    },
  });

  assert.equal(
    harness.sessionManager.getSession(session.id)?.modelBinding,
    undefined
  );
  assert.deepEqual(harness.events, []);
});
