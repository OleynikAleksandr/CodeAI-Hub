import assert from "node:assert/strict";
import test from "node:test";
import { Logger } from "../../telemetry/logger";
import { SessionProviderEventRouter } from "./session-provider-event-router";

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
      getSession: () => ({
        id: "session-1",
        workspacePath: "/tmp/workspace",
        stage: "description",
        providerId: "geminiCli",
      }),
    } as never,
    updateBindingWithResolvedId: () => {
      // noop
    },
  });

  router.handleProviderEvent("session-1", {
    type: "turn_failed",
    provider: "gemini",
    message: "Gemini stream stalled after 60s without progress.",
    timestamp: "2026-03-30T13:34:17.397Z",
  });

  assert.equal(appended.length, 1);
  assert.equal(appended[0]?.sessionId, "session-1");
  assert.equal(appended[0]?.role, "system");
  assert.deepEqual(appended[0]?.event, {
    content:
      "Provider turn failed: Gemini stream stalled after 60s without progress.",
    timestamp: "2026-03-30T13:34:17.397Z",
  });
  assert.equal(
    broadcasts.some(
      (event) =>
        (event as { type?: string }).type === "session:error" &&
        ((event as { payload?: { message?: string } }).payload?.message ??
          "") === "Gemini stream stalled after 60s without progress."
    ),
    true
  );
});
