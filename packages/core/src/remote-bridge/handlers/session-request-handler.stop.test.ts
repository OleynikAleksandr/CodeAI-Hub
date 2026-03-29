import assert from "node:assert/strict";
import test from "node:test";
import {
  countContinuityUnlocks,
  createDescriptionSession,
  createHarness,
  flushAsyncWork,
  noop,
  registerBootstrapLock,
  setLifecycle,
  stubDescriptionDialogSync,
} from "./session-request-handler.test";

test("SessionRequestHandler stop clears bootstrap locks and restores send path", async () => {
  const harness = createHarness();
  const sourceSession = createDescriptionSession(
    harness,
    "/tmp/core-stop-rollover-source",
    "provider-session-rollover-source"
  );
  const targetSession = createDescriptionSession(
    harness,
    "/tmp/core-stop-rollover-target",
    "provider-session-rollover-target",
    "geminiCli"
  );
  const sendCalls: Array<{
    readonly content: string;
    readonly providerSessionId: string;
  }> = [];
  stubDescriptionDialogSync(harness);
  setLifecycle(harness, sourceSession.id, "resume_via_rollover");
  setLifecycle(harness, targetSession.id, "resume_via_rollover");
  registerBootstrapLock(
    harness,
    sourceSession.id,
    targetSession.id,
    "rollover-stop-unlock"
  );
  harness.providerSessions.set(targetSession.id, {
    providerId: "geminiCli",
    providerSessionId: "provider-session-rollover-target",
    unsubscribe: noop,
  });
  harness.providerRegistry.getAdapter = () => ({
    closeSession: async () => Promise.resolve(),
    createSession: async () => "provider-session-after-stop-lock",
    subscribe: () => noop,
    sendMessage: (providerSessionId: string, content: string) => {
      sendCalls.push({ providerSessionId, content });
      return Promise.resolve();
    },
  });

  await harness.handler.handleStop(targetSession.id);
  await harness.handler.handleMessage(targetSession.id, "retry after stop");
  await flushAsyncWork();

  assert.equal(
    (harness.api as any).continuityLockService.hasContext(sourceSession.id),
    false
  );
  assert.equal(
    (harness.api as any).continuityLockService.hasContext(targetSession.id),
    false
  );
  assert.equal(countContinuityUnlocks(harness, "resume_failed"), 2);
  assert.deepEqual(sendCalls, [
    {
      providerSessionId: "provider-session-after-stop-lock",
      content: "retry after stop",
    },
  ]);
  assert.equal(
    harness.events.some((event) => {
      if (event.type !== "session:error") {
        return false;
      }
      const payload = event.payload as { readonly code?: string };
      return payload.code === "continuity_rollover_pending";
    }),
    false
  );
});
