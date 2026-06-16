import assert from "node:assert/strict";
import test from "node:test";
import {
  createDescriptionSession,
  registerBootstrapLock,
  setLifecycle,
  stubDescriptionDialogSync,
} from "./session-request-handler.test-continuity-helpers";
import {
  countContinuityUnlocks,
  createHarness,
  flushAsyncWork,
  type HandlerHarness,
  internals,
  noop,
} from "./session-request-handler.test-helpers";

const hasRuntimeUnlock = (
  harness: HandlerHarness,
  sessionId: string
): boolean =>
  harness.runtimeLockUpdates.some(
    (update) =>
      update.sessionId === sessionId &&
      update.active === false &&
      update.reason === null
  );

const hasManagedInputGateUnlock = (harness: HandlerHarness): boolean =>
  harness.events.some((event) => {
    if (event.type !== "session:stream") {
      return false;
    }
    const payload = event.payload as {
      readonly event?: { readonly data?: Record<string, unknown> };
    };
    const data = payload.event?.data;
    return (
      data?.kind === "managed_input_gate" &&
      data.active === false &&
      data.force === true
    );
  });

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

  const api = internals(harness.handler);
  assert.equal(api.continuityLockService.hasContext(sourceSession.id), false);
  assert.equal(api.continuityLockService.hasContext(targetSession.id), false);
  assert.equal(countContinuityUnlocks(harness, "resume_failed"), 2);
  assert.equal(sendCalls.length, 1);
  assert.equal(
    sendCalls[0]?.providerSessionId,
    "provider-session-after-stop-lock"
  );
  assert.equal(
    (sendCalls[0]?.content ?? "").startsWith("## CodeAI Hub Workspace Context"),
    true
  );
  assert.equal(
    (sendCalls[0]?.content ?? "").includes(
      "Workspace root: `/tmp/core-stop-rollover-target`"
    ),
    true
  );
  assert.equal(
    (sendCalls[0]?.content ?? "").includes("retry after stop"),
    true
  );
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

test("SessionRequestHandler stop force-releases managed input gates", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "codexCli",
    "/tmp/core-stop-managed-gate",
    "provider-session-managed-stop",
    { stage: "quality_gates" }
  );
  harness.providerSessions.set(session.id, {
    providerId: "codexCli",
    providerSessionId: "provider-session-managed-stop",
    unsubscribe: noop,
  });
  harness.providerRegistry.getAdapter = () => ({
    closeSession: async () => Promise.resolve(),
  });

  await harness.handler.handleStop(session.id);

  assert.equal(hasRuntimeUnlock(harness, session.id), true);
  assert.equal(hasManagedInputGateUnlock(harness), true);
});

test("SessionRequestHandler stop unlocks product part managed repairs", async () => {
  const harness = createHarness();
  const session = harness.sessionManager.createSession(
    "glmOpenCode",
    "/tmp/core-stop-product-part-managed-gate",
    "provider-session-product-part-stop",
    { stage: "development_tree/materialized/product-parts/finder-widget" }
  );
  harness.providerSessions.set(session.id, {
    providerId: "glmOpenCode",
    providerSessionId: "provider-session-product-part-stop",
    unsubscribe: noop,
  });
  harness.providerRegistry.getAdapter = () => ({
    closeSession: async () => Promise.resolve(),
  });

  await harness.handler.handleStop(session.id);

  assert.equal(hasRuntimeUnlock(harness, session.id), true);
  assert.equal(hasManagedInputGateUnlock(harness), true);
});
