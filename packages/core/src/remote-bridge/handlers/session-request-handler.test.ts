import assert from "node:assert/strict";
import test from "node:test";
import "./session-request-handler.settings-fixtures.test";
import "./session-request-handler.usage-limits.test";
import {
  createDescriptionSession,
  stubDescriptionDialogSync,
} from "./session-request-handler.test-continuity-helpers";
import {
  collectTurnStateSequence,
  createHarness,
  noop,
} from "./session-request-handler.test-helpers";

export {
  createDescriptionSession,
  emitProviderEvent,
  registerBootstrapLock,
  setLifecycle,
  stubDescriptionDialogSync,
  useProductionFlowNodeHandler,
} from "./session-request-handler.test-continuity-helpers";
export {
  type BindingUpdate,
  collectTurnStateSequence,
  countContextCheckPendingLockEvents,
  countContinuityUnlocks,
  countIdleTurnStateEvents,
  countNoRolloverUnlockEvents,
  createHarness,
  EXPECTED_HANDLER_SOURCE_INVARIANT_CHECKS,
  flushAsyncWork,
  getHandlerSourceInvariantChecks,
  type HandlerHarness,
  type HandlerTestInternals,
  internals,
  noop,
  type RuntimeLockUpdate,
  SOURCE_PATH,
} from "./session-request-handler.test-helpers";

test("SessionRequestHandler stop invalidates provider binding without deleting logical session", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "geminiCli",
    "/tmp/core-stop-invalidates-binding",
    "provider-session-before-stop"
  );
  const closeCalls: string[] = [];
  harness.providerSessions.set(session.id, {
    providerId: "geminiCli",
    providerSessionId: "provider-session-before-stop",
    unsubscribe: noop,
  });
  harness.providerRegistry.getAdapter = () => ({
    closeSession: (providerSessionId: string) => {
      closeCalls.push(providerSessionId);
      return Promise.resolve();
    },
  });

  await harness.handler.handleStop(session.id);

  const updatedSession = harness.sessionManager.getSession(session.id);
  assert.ok(updatedSession);
  assert.equal(updatedSession?.providerSessionId, undefined);
  assert.equal(updatedSession?.providerSessionStatus, "pending");
  assert.equal(
    harness.sessionManager.hasStopInvalidatedBinding(session.id),
    true
  );
  assert.equal(harness.providerSessions.has(session.id), false);
  assert.deepEqual(closeCalls, ["provider-session-before-stop"]);
  assert.deepEqual(collectTurnStateSequence(harness.events), ["idle"]);
  assert.equal(
    harness.events.some((event) => {
      if (event.type !== "session:deleted") {
        return false;
      }
      const payload = event.payload as { readonly sessionId?: string };
      return payload.sessionId === session.id;
    }),
    false
  );
});

test("SessionRequestHandler rebinds stop-invalidated sessions on the next send", async () => {
  const harness = createHarness();
  const session = createDescriptionSession(
    harness,
    "/tmp/core-stop-rebind-send",
    "provider-session-before-stop",
    "geminiCli"
  );
  const closeCalls: string[] = [];
  const createCalls: string[] = [];
  const subscribeCalls: string[] = [];
  const sendCalls: Array<{
    readonly content: string;
    readonly providerSessionId: string;
  }> = [];
  stubDescriptionDialogSync(harness);
  harness.providerSessions.set(session.id, {
    providerId: "geminiCli",
    providerSessionId: "provider-session-before-stop",
    unsubscribe: noop,
  });
  harness.providerRegistry.getAdapter = () => ({
    closeSession: (providerSessionId: string) => {
      closeCalls.push(providerSessionId);
      return Promise.resolve();
    },
    createSession: (workspacePath: string) => {
      createCalls.push(workspacePath);
      return Promise.resolve("provider-session-after-stop");
    },
    subscribe: (providerSessionId: string) => {
      subscribeCalls.push(providerSessionId);
      return noop;
    },
    sendMessage: (providerSessionId: string, content: string) => {
      sendCalls.push({ providerSessionId, content });
      return Promise.resolve();
    },
  });

  await harness.handler.handleStop(session.id);
  await harness.handler.handleMessage(session.id, "resume after stop");

  const updatedSession = harness.sessionManager.getSession(session.id);
  assert.equal(
    updatedSession?.providerSessionId,
    "provider-session-after-stop"
  );
  assert.equal(updatedSession?.providerSessionStatus, "ready");
  assert.equal(
    harness.sessionManager.hasStopInvalidatedBinding(session.id),
    false
  );
  assert.deepEqual(closeCalls, ["provider-session-before-stop"]);
  assert.deepEqual(createCalls, ["/tmp/core-stop-rebind-send"]);
  assert.deepEqual(subscribeCalls, ["provider-session-after-stop"]);
  assert.equal(sendCalls.length, 1);
  const sentContent = sendCalls[0]?.content ?? "";
  assert.equal(
    sentContent.includes("Workspace root: `/tmp/core-stop-rebind-send`") &&
      sentContent.includes("resume after stop"),
    true
  );
  assert.deepEqual(harness.continuityUpdates, [
    {
      sessionId: session.id,
      providerSessionId: "provider-session-after-stop",
    },
  ]);
  assert.equal(
    harness.events.some((event) => {
      if (event.type !== "session:error") {
        return false;
      }
      const payload = event.payload as { readonly code?: string };
      return payload.code === "missing_provider_binding";
    }),
    false
  );
});
