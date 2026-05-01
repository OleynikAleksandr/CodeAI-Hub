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
    providerId: "claudeCodeCli",
    sessionId,
    workspacePath,
  }),
  providerId: "claudeCodeCli",
  baseModelId: "opus",
  modelId: "opus reasoning:medium",
  reasoningEffort: "medium",
  thinkingEnabled: true,
  source: "start_step_selection",
  boundAt: "2026-05-01T06:00:00.000Z",
  updatedAt: "2026-05-01T06:00:00.000Z",
});

test("Claude thinking-switch updates effort and preserves base model", async () => {
  const harness = createHarness();
  const router = createRouter(harness);
  const session = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/claude-thinking-switch",
    "provider-session-claude"
  );
  harness.sessionManager.setModelBinding(
    session.id,
    createPreviousBinding(session.id, session.workspacePath)
  );

  await router.handleIncomingMessage("client-1", {
    type: "session:claude:thinking-switch",
    payload: {
      sessionId: session.id,
      thinkingEnabled: true,
      targetReasoningEffort: "xhigh",
    },
  });

  const updatedBinding = harness.sessionManager.getSession(
    session.id
  )?.modelBinding;
  assert.equal(updatedBinding?.baseModelId, "opus");
  assert.equal(updatedBinding?.reasoningEffort, "xhigh");
  assert.equal(updatedBinding?.thinkingEnabled, true);
  assert.equal(updatedBinding?.modelId, "opus reasoning:xhigh");
});

test("Claude thinking-switch maps thinking off without retaining effort", async () => {
  const harness = createHarness();
  const router = createRouter(harness);
  const session = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/claude-thinking-switch-off",
    "provider-session-claude"
  );
  harness.sessionManager.setModelBinding(
    session.id,
    createPreviousBinding(session.id, session.workspacePath)
  );

  await router.handleIncomingMessage("client-1", {
    type: "session:claude:thinking-switch",
    payload: {
      sessionId: session.id,
      thinkingEnabled: false,
    },
  });

  const updatedBinding = harness.sessionManager.getSession(
    session.id
  )?.modelBinding;
  assert.equal(updatedBinding?.baseModelId, "opus");
  assert.equal(updatedBinding?.thinkingEnabled, false);
  assert.equal(updatedBinding?.reasoningEffort, undefined);
  assert.equal(updatedBinding?.modelId, "opus thinking:off");
});

test("Claude thinking-switch ignores non-Claude sessions", async () => {
  const harness = createHarness();
  const router = createRouter(harness);
  const session = harness.sessionManager.createSession(
    "codexCli",
    "/tmp/claude-thinking-switch-non-claude",
    "provider-session-codex"
  );

  await router.handleIncomingMessage("client-1", {
    type: "session:claude:thinking-switch",
    payload: {
      sessionId: session.id,
      thinkingEnabled: true,
      targetReasoningEffort: "high",
    },
  });

  assert.equal(
    harness.sessionManager.getSession(session.id)?.modelBinding,
    undefined
  );
  assert.deepEqual(harness.events, []);
});
