import assert from "node:assert/strict";
import test from "node:test";
import {
  countContextCheckPendingLockEvents,
  countContinuityUnlocks,
  countIdleTurnStateEvents,
  countNoRolloverUnlockEvents,
  createDescriptionSession,
  createHarness,
  emitProviderEvent,
  flushAsyncWork,
  noop,
  registerBootstrapLock,
  setLifecycle,
  useProductionFlowNodeHandler,
} from "./session-request-handler.test";

test("SessionRequestHandler unlocks continuity locks for ready, failed and timed out rollovers", async () => {
  const harness = createHarness();
  const sourceSession = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-rollover-source"
  );
  const targetSession = harness.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-rollover-target"
  );

  for (const [reason, trigger] of [
    [
      "resume_ready",
      () =>
        emitProviderEvent(harness, targetSession.id, {
          type: "turn_completed",
        }),
    ],
    [
      "resume_failed",
      () =>
        emitProviderEvent(harness, targetSession.id, { type: "turn_failed" }),
    ],
    [
      "resume_timeout",
      () =>
        (
          harness.api as any
        ).continuityLockService.finalizeFlowNodeContinuityLock({
          sessionId: targetSession.id,
          reason: "resume_timeout",
        }),
    ],
  ] as const) {
    setLifecycle(harness, sourceSession.id, "resume_via_rollover");
    setLifecycle(harness, targetSession.id, "resume_via_rollover");
    registerBootstrapLock(harness, sourceSession.id, targetSession.id, reason);
    trigger();
    await flushAsyncWork();
    assert.equal(countContinuityUnlocks(harness, reason), 2, reason);
  }
  assert.equal(
    (harness.api as any).continuityLockService.hasContext(sourceSession.id),
    false
  );
});

test("SessionRequestHandler normalizes post-resume lifecycle and avoids relock", async () => {
  const harness = createHarness();
  const sourceSession = createDescriptionSession(
    harness,
    "/tmp/core-post-resume-source",
    "provider-session-post-resume-source"
  );
  const targetSession = createDescriptionSession(
    harness,
    "/tmp/core-post-resume-target",
    "provider-session-post-resume-target"
  );
  const orchestrator = (harness.api as any)
    .continuityRolloverOrchestrator as any;

  setLifecycle(harness, sourceSession.id, "resume_via_rollover");
  setLifecycle(harness, targetSession.id, "resume_via_rollover");
  for (const key of ["rolloverStarted", "rolloverInFlight"] as const) {
    orchestrator[key].add(sourceSession.id);
    orchestrator[key].add(targetSession.id);
  }
  registerBootstrapLock(
    harness,
    sourceSession.id,
    targetSession.id,
    "rollover-post-resume"
  );
  useProductionFlowNodeHandler(harness);
  (harness.api as any).resolveLiveContinuityRemainingPercentThreshold =
    async () => 30;

  emitProviderEvent(harness, targetSession.id, { type: "turn_completed" });
  await flushAsyncWork();
  assert.equal(
    (harness.api as any).resumeLifecycle.sessionResumeLifecycleStates.get(
      targetSession.id
    )?.mode,
    "resume_in_place"
  );
  assert.equal(orchestrator.hasPending(sourceSession.id), false);
  assert.equal(orchestrator.hasPending(targetSession.id), false);

  emitProviderEvent(harness, targetSession.id, {
    type: "turn_completed",
    tokenUsage: { used: 50_000, limit: 200_000 },
    usage: { used: 50_000, limit: 200_000 },
  });
  await flushAsyncWork();
  assert.equal(harness.runtimeLockUpdates.at(-1)?.reason, "no_rollover_needed");
  assert.equal(countNoRolloverUnlockEvents(harness.events), 1);
});

test("SessionRequestHandler suppresses premature idle while async rollover arbitration is unresolved", async () => {
  const asyncGate = createHarness();
  const asyncSession = createDescriptionSession(
    asyncGate,
    "/tmp/core-turn-completed-async-dual-gate",
    "provider-session-async-dual-gate"
  );
  setLifecycle(asyncGate, asyncSession.id, "resume_in_place");
  let resolveArbitration: () => void = noop;
  (asyncGate.api as any).handleFlowNodeContinuityProviderEvent = () =>
    new Promise<void>((resolve) => {
      resolveArbitration = () => {
        (
          asyncGate.api as any
        ).continuityLockService.registerFlowNodeContinuityLockContext({
          rolloverId: "rollover-async-dual-gate",
          sourceSessionId: asyncSession.id,
          stageId: "description",
          runSlug: "reviewer",
          awaitingBootstrapTurn: false,
        });
        resolve();
      };
    });
  emitProviderEvent(asyncGate, asyncSession.id, { type: "turn_completed" });
  await flushAsyncWork();
  assert.equal(countIdleTurnStateEvents(asyncGate.events), 0);
  resolveArbitration();
  await flushAsyncWork();
  assert.equal(countNoRolloverUnlockEvents(asyncGate.events), 0);
});

test("SessionRequestHandler resolves delayed no-rollover on the production token-usage path", async () => {
  const harness = createHarness();
  const session = createDescriptionSession(
    harness,
    "/tmp/core-trailing-token-usage",
    "provider-session-trailing-token-usage"
  );
  setLifecycle(harness, session.id, "resume_in_place");
  useProductionFlowNodeHandler(harness);
  (harness.api as any).resolveLiveContinuityRemainingPercentThreshold =
    async () => 30;

  emitProviderEvent(harness, session.id, { type: "turn_completed" });
  await flushAsyncWork();
  assert.equal(countContextCheckPendingLockEvents(harness.events), 1);
  emitProviderEvent(harness, session.id, {
    type: "stream_event",
    data: { kind: "token_usage", used: 50_000, limit: 200_000 },
    tokenUsage: { used: 50_000, limit: 200_000 },
  });
  await flushAsyncWork();
  assert.equal(countIdleTurnStateEvents(harness.events), 1);
  assert.equal(countNoRolloverUnlockEvents(harness.events), 1);
});

test("SessionRequestHandler starts rollover only after turn_completed and clears cached snapshots on the next turn", async () => {
  const harness = createHarness();
  const session = createDescriptionSession(
    harness,
    "/tmp/core-gemini-post-turn-rollover",
    "provider-session-gemini-rollover",
    "geminiCli"
  );
  setLifecycle(harness, session.id, "resume_in_place");
  useProductionFlowNodeHandler(harness);
  (harness.api as any).resolveLiveContinuityRemainingPercentThreshold =
    async () => 80;
  const rolloverStarts: string[] = [];
  (
    harness.api as any
  ).continuityRolloverOrchestrator.startFlowNodeRolloverFromUsage = (options: {
    readonly sessionId: string;
  }) => {
    rolloverStarts.push(options.sessionId);
    (harness.api as any).resumeLifecycle.recordPostTurnContextDecision(
      options.sessionId,
      "rollover_required"
    );
    return Promise.resolve();
  };

  emitProviderEvent(harness, session.id, {
    type: "stream_event",
    data: { kind: "token_usage", used: 150_000, limit: 200_000 },
    tokenUsage: { used: 150_000, limit: 200_000 },
  });
  await flushAsyncWork();
  assert.deepEqual(rolloverStarts, []);
  emitProviderEvent(harness, session.id, { type: "turn_completed" });
  await flushAsyncWork();
  assert.deepEqual(rolloverStarts, [session.id]);

  harness.providerSessions.set(session.id, {
    providerId: "geminiCli",
    providerSessionId: "provider-session-gemini-rollover",
    unsubscribe: noop,
  });
  harness.providerRegistry.getAdapter = () => ({
    sendMessage: async () => Promise.resolve(),
  });
  await harness.handler.handleMessage(session.id, "next turn");
  await flushAsyncWork();
  assert.equal(
    (harness.api as any).continuityRolloverOrchestrator.getTokenUsageSnapshot(
      session.id
    ),
    null
  );
});

test("SessionRequestHandler enforces rollover-pending send guards", async () => {
  const pending = createHarness();
  const sourceSession = createDescriptionSession(
    pending,
    "/tmp/core-send-guard",
    "provider-session-2"
  );
  const targetSession = pending.sessionManager.createSession(
    "claudeCodeCli",
    "/tmp/core-send-guard"
  );
  (
    pending.api as any
  ).continuityLockService.registerFlowNodeContinuityLockContext({
    rolloverId: "rollover-guard",
    sourceSessionId: sourceSession.id,
    targetSessionId: targetSession.id,
    stageId: "description",
    runSlug: "reviewer",
    awaitingBootstrapTurn: true,
  });
  await pending.handler.handleMessage(sourceSession.id, "hello");
  assert.ok(
    pending.events.find((event) => {
      const payload = event.payload as {
        readonly code?: string;
        readonly sessionId?: string;
      };
      return (
        event.type === "session:error" &&
        payload.code === "continuity_rollover_pending" &&
        payload.sessionId === sourceSession.id
      );
    })
  );
});
