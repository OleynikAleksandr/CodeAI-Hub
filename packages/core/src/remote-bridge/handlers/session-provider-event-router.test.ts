import assert from "node:assert/strict";
import test from "node:test";
import { Logger } from "../../telemetry/logger";
import { SessionProviderEventRouter } from "./session-provider-event-router";

const CODEX_AUTH_RECOVERY_RE = /Codex authentication needs/u;
const CODEX_LOGOUT_COMMAND_RE = /codex logout/u;
const CODEX_LOGIN_COMMAND_RE = /codex login/u;

test("SessionProviderEventRouter materializes turn_failed as history-visible system message", () => {
  const appended: Array<{
    sessionId: string;
    role: "assistant" | "system" | "thinking";
    event: unknown;
  }> = [];
  const broadcasts: unknown[] = [];

  const router = new SessionProviderEventRouter({
    appendDialogMessage: () => {
      // noop
    },
    appendProviderMessage: (sessionId, role, event) => {
      appended.push({ sessionId, role, event });
    },
    broadcaster: (event) => {
      broadcasts.push(event);
    },
    clearPostTurnContextDecision: () => {
      // noop
    },
    emitTurnStateEvent: () => {
      // noop
    },
    finalizeFlowNodeContinuityLockOnBootstrapGate: () => {
      // noop
    },
    handleFlowNodeContinuityProviderEvent: async () => {
      // noop
    },
    handleSessionContinuityProviderEvent: async () => {
      // noop
    },
    handleTurnCompletedWithFlowNodeArbitration: () => {
      // noop
    },
    logger: new Logger("error"),
    markPostTurnContextDecisionPending: () => {
      // noop
    },
    sessionManager: {
      getSession: (sessionId: string) => ({
        id: sessionId,
        workspacePath: "/tmp/workspace",
        stage: "description",
        providerId:
          sessionId === "codex-session" ? "codexCli" : "claudeCodeCli",
      }),
    } as never,
    updateBindingWithResolvedId: () => {
      // noop
    },
    waitForProviderMessagePersistence: async () => {
      // noop
    },
  });

  router.handleProviderEvent("session-1", {
    type: "turn_failed",
    provider: "claude",
    message: "Claude stream stalled after 60s without progress.",
    timestamp: "2026-03-30T13:34:17.397Z",
  });

  assert.equal(appended.length, 1);
  assert.equal(appended[0]?.sessionId, "session-1");
  assert.equal(appended[0]?.role, "system");
  assert.deepEqual(appended[0]?.event, {
    content:
      "Provider turn failed: Claude stream stalled after 60s without progress.",
    timestamp: "2026-03-30T13:34:17.397Z",
  });
  assert.equal(
    broadcasts.some(
      (event) =>
        (event as { type?: string }).type === "session:error" &&
        ((event as { payload?: { message?: string } }).payload?.message ??
          "") === "Claude stream stalled after 60s without progress."
    ),
    true
  );

  router.handleProviderEvent("codex-session", {
    type: "turn_failed",
    provider: "codex",
    message:
      "Your access token could not be refreshed because your refresh token was already used. Please log out and sign in again.",
  });

  const codexFailure = appended[1]?.event as { readonly content?: string };
  assert.match(codexFailure.content ?? "", CODEX_AUTH_RECOVERY_RE);
  assert.match(codexFailure.content ?? "", CODEX_LOGOUT_COMMAND_RE);
  assert.match(codexFailure.content ?? "", CODEX_LOGIN_COMMAND_RE);
});

test("SessionProviderEventRouter keeps model_info updates on session binding", () => {
  const broadcasts: unknown[] = [];

  const router = new SessionProviderEventRouter({
    appendDialogMessage: () => {
      // noop
    },
    appendProviderMessage: () => {
      // noop
    },
    broadcaster: (event) => {
      broadcasts.push(event);
    },
    clearPostTurnContextDecision: () => {
      // noop
    },
    emitTurnStateEvent: () => {
      // noop
    },
    finalizeFlowNodeContinuityLockOnBootstrapGate: () => {
      // noop
    },
    handleFlowNodeContinuityProviderEvent: async () => {
      // noop
    },
    handleSessionContinuityProviderEvent: async () => {
      // noop
    },
    handleTurnCompletedWithFlowNodeArbitration: () => {
      // noop
    },
    logger: new Logger("error"),
    markPostTurnContextDecisionPending: () => {
      // noop
    },
    resolveEffectiveModelId: () => "gpt-5.3-codex-spark reasoning:medium",
    sessionManager: {
      getSession: () => ({
        id: "session-1",
        workspacePath: "/tmp/workspace",
        stage: "description",
        providerId: "codexCli",
        modelBinding: {
          key: "provider\u001fcodexCli\u001fsession\u001fsession-1",
          providerId: "codexCli",
          baseModelId: "gpt-5.3-codex-spark",
          modelId: "gpt-5.3-codex-spark reasoning:xhigh",
          reasoningEffort: "xhigh",
          source: "settings_default",
          boundAt: "2026-04-28T12:00:00.000Z",
          updatedAt: "2026-04-28T12:00:00.000Z",
        },
      }),
    } as never,
    updateBindingWithResolvedId: () => {
      // noop
    },
    waitForProviderMessagePersistence: async () => {
      // noop
    },
  });

  router.handleProviderEvent("session-1", {
    type: "model_info",
    data: { model: "gpt-5.3-codex-spark" },
  });

  const update = broadcasts.find(
    (event) => (event as { type?: string }).type === "session:model:update"
  ) as { payload?: { modelId?: string; modelBinding?: { modelId?: string } } };

  assert.equal(update?.payload?.modelId, "gpt-5.3-codex-spark reasoning:xhigh");
  assert.equal(
    update?.payload?.modelBinding?.modelId,
    "gpt-5.3-codex-spark reasoning:xhigh"
  );
});

test("SessionProviderEventRouter appends deferred user_input when provider turn starts", () => {
  const dialogMessages: Array<{ sessionId: string; payload: unknown }> = [];

  const router = new SessionProviderEventRouter({
    appendDialogMessage: (sessionId, payload) => {
      dialogMessages.push({ sessionId, payload });
    },
    appendProviderMessage: () => {
      // noop
    },
    broadcaster: () => {
      // noop
    },
    clearPostTurnContextDecision: () => {
      // noop
    },
    emitTurnStateEvent: () => {
      // noop
    },
    finalizeFlowNodeContinuityLockOnBootstrapGate: () => {
      // noop
    },
    handleFlowNodeContinuityProviderEvent: async () => {
      // noop
    },
    handleSessionContinuityProviderEvent: async () => {
      // noop
    },
    handleTurnCompletedWithFlowNodeArbitration: () => {
      // noop
    },
    logger: new Logger("error"),
    markPostTurnContextDecisionPending: () => {
      // noop
    },
    sessionManager: {
      getSession: () => ({
        id: "session-1",
        workspacePath: "/tmp/workspace",
        stage: "diagram_modules",
        providerId: "claudeCodeCli",
      }),
    } as never,
    updateBindingWithResolvedId: () => {
      // noop
    },
    waitForProviderMessagePersistence: async () => {
      // noop
    },
  });

  router.handleProviderEvent("session-1", {
    content: "Core acceptance check failed for Diagram Modules.",
    timestamp: "2026-05-08T14:20:24.000Z",
    type: "user_input",
    userMessageVisibility: "deferred",
    uuid: "core-feedback-1",
  });
  router.handleProviderEvent("session-1", {
    content: "normal user echo should stay ignored",
    type: "user_input",
  });

  assert.deepEqual(dialogMessages, [
    {
      sessionId: "session-1",
      payload: {
        content: "Core acceptance check failed for Diagram Modules.",
        role: "user",
        tag: "core-deferred-user",
        timestamp: "2026-05-08T14:20:24.000Z",
        uuid: "core-feedback-1",
      },
    },
  ]);
});

test("SessionProviderEventRouter delays turn_completed and skips idle arbitration for managed continuations", async () => {
  const events: string[] = [];
  let releaseFlush: () => void = () => {
    // assigned by Promise executor below
  };
  const flushPromise = new Promise<void>((resolve) => {
    releaseFlush = resolve;
  });

  const router = new SessionProviderEventRouter({
    appendDialogMessage: () => {
      // noop
    },
    appendProviderMessage: () => {
      // noop
    },
    broadcaster: (event) => {
      events.push(
        (event as { payload?: { event?: { type?: string } } }).payload?.event
          ?.type ?? "broadcast"
      );
    },
    clearPostTurnContextDecision: () => {
      // noop
    },
    emitTurnStateEvent: ({ state }) => {
      events.push(`turn_state:${state}`);
    },
    finalizeFlowNodeContinuityLockOnBootstrapGate: () => {
      // noop
    },
    handleFlowNodeContinuityProviderEvent: () => {
      events.push("flow-node");
      return Promise.resolve();
    },
    handleManagedWorkflowTurnCompleted: () => {
      events.push("managed");
      return Promise.resolve("continued");
    },
    handleSessionContinuityProviderEvent: async () => {
      // noop
    },
    handleTurnCompletedWithFlowNodeArbitration: () => {
      events.push("arbitration");
    },
    logger: new Logger("error"),
    markPostTurnContextDecisionPending: () => {
      events.push("decision-pending");
    },
    sessionManager: {
      getSession: () => ({
        id: "session-1",
        workspacePath: "/tmp/workspace",
        stage: "diagram_modules",
        providerId: "claudeCodeCli",
      }),
    } as never,
    updateBindingWithResolvedId: () => {
      // noop
    },
    waitForProviderMessagePersistence: async () => {
      await flushPromise;
      events.push("messages-flushed");
    },
    workspaceRuntime: {
      notifyLockChanged: () => {
        // noop
      },
    } as never,
  });

  const terminalEvent = {
    eventId: "managed-turn-1",
    provider: "claude",
    type: "turn_completed",
  };
  router.handleProviderEvent("session-1", terminalEvent);

  await Promise.resolve();
  assert.deepEqual(events, ["decision-pending", "flow-node"]);

  releaseFlush();
  await flushPromise;
  await Promise.resolve();
  await new Promise<void>((resolve) => setImmediate(resolve));

  assert.deepEqual(events, [
    "decision-pending",
    "flow-node",
    "messages-flushed",
    "stream_event",
    "turn_state:running",
    "turn_completed",
    "managed",
    "stream_event",
  ]);

  router.handleProviderEvent("session-1", terminalEvent);
  await new Promise<void>((resolve) => setImmediate(resolve));

  assert.equal(events.filter((entry) => entry === "managed").length, 2);
});

test("SessionProviderEventRouter deduplicates terminal events with the same provider id", () => {
  const decisionPendingCalls: string[] = [];
  const arbitrationCalls: string[] = [];

  const router = new SessionProviderEventRouter({
    appendDialogMessage: () => {
      // noop
    },
    appendProviderMessage: () => {
      // noop
    },
    broadcaster: () => {
      // noop
    },
    clearPostTurnContextDecision: () => {
      // noop
    },
    emitTurnStateEvent: () => {
      // noop
    },
    finalizeFlowNodeContinuityLockOnBootstrapGate: () => {
      // noop
    },
    handleFlowNodeContinuityProviderEvent: async () => {
      // noop
    },
    handleSessionContinuityProviderEvent: async () => {
      // noop
    },
    handleTurnCompletedWithFlowNodeArbitration: (sessionId) => {
      arbitrationCalls.push(sessionId);
    },
    logger: new Logger("error"),
    markPostTurnContextDecisionPending: (sessionId) => {
      decisionPendingCalls.push(sessionId);
    },
    sessionManager: {
      getSession: () => ({
        id: "session-1",
        workspacePath: "/tmp/workspace",
        stage: "diagram_modules",
        providerId: "codexCli",
      }),
    } as never,
    updateBindingWithResolvedId: () => {
      // noop
    },
    waitForProviderMessagePersistence: async () => {
      // noop
    },
  });

  const sameTerminalEvent = {
    eventId: "evt-42",
    provider: "codex",
    type: "turn_completed",
  };
  router.handleProviderEvent("session-1", sameTerminalEvent);
  router.handleProviderEvent("session-1", sameTerminalEvent);
  router.handleProviderEvent("session-1", {
    eventId: "evt-43",
    provider: "codex",
    type: "turn_completed",
  });

  assert.deepEqual(decisionPendingCalls, ["session-1", "session-1"]);
});

test("SessionProviderEventRouter deduplicates terminal events without provider id via Core counter", () => {
  const decisionPendingCalls: string[] = [];

  const router = new SessionProviderEventRouter({
    appendDialogMessage: () => {
      // noop
    },
    appendProviderMessage: () => {
      // noop
    },
    broadcaster: () => {
      // noop
    },
    clearPostTurnContextDecision: () => {
      // noop
    },
    emitTurnStateEvent: () => {
      // noop
    },
    finalizeFlowNodeContinuityLockOnBootstrapGate: () => {
      // noop
    },
    handleFlowNodeContinuityProviderEvent: async () => {
      // noop
    },
    handleSessionContinuityProviderEvent: async () => {
      // noop
    },
    handleTurnCompletedWithFlowNodeArbitration: () => {
      // noop
    },
    logger: new Logger("error"),
    markPostTurnContextDecisionPending: (sessionId) => {
      decisionPendingCalls.push(sessionId);
    },
    sessionManager: {
      getSession: () => ({
        id: "session-1",
        workspacePath: "/tmp/workspace",
        stage: "diagram_modules",
        providerId: "codexCli",
      }),
    } as never,
    updateBindingWithResolvedId: () => {
      // noop
    },
    waitForProviderMessagePersistence: async () => {
      // noop
    },
  });

  const eventWithTimestamp = {
    timestamp: "2026-05-10T10:00:00.000Z",
    type: "turn_completed",
  };
  router.handleProviderEvent("session-1", eventWithTimestamp);
  router.handleProviderEvent("session-1", eventWithTimestamp);
  router.handleProviderEvent("session-1", {
    timestamp: "2026-05-10T10:00:01.000Z",
    type: "turn_completed",
  });

  assert.deepEqual(decisionPendingCalls, ["session-1", "session-1"]);
});
