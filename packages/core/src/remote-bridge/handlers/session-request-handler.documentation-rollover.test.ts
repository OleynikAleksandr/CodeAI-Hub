import assert from "node:assert/strict";
import test from "node:test";
import { countContinuityUnlocks } from "./session-request-handler.test-event-helpers";
import {
  createHarness,
  internals,
} from "./session-request-handler.test-helpers";

test("rolloverFlowNodeSession materializes Documentation Tree synthetic rollover state without report turn", async () => {
  const harness = createHarness();
  const sourceSession = harness.sessionManager.createSession(
    "codexCli",
    "/tmp/core-documentation-synthetic-rollover",
    "provider-source-documentation-rollover",
    {
      initiativeSlug: "demo",
      stage: "diagram_modules",
      runSlug: null,
    }
  );
  const targetSession = harness.sessionManager.createSession(
    "codexCli",
    "/tmp/core-documentation-synthetic-rollover",
    "provider-target-documentation-rollover",
    {
      continuationParentId: sourceSession.id,
      initiativeSlug: "demo",
      stage: "diagram_modules",
      runSlug: null,
    }
  );
  harness.sessionManager.appendMessage(
    sourceSession.id,
    "assistant",
    "Ready to continue working"
  );
  harness.sessionManager.appendMessage(
    sourceSession.id,
    "assistant",
    "Internal thinking should not be captured",
    { tag: "thinking", visibilityAtEmission: "hidden" }
  );
  harness.sessionManager.appendMessage(
    sourceSession.id,
    "assistant",
    "Which module boundary should we refine next?"
  );

  const api = internals(harness.handler);
  const internalMessages: { readonly content: string }[] = [];
  const createSessionCalls: Record<string, unknown>[] = [];
  harness.providerRegistry.getAdapter = () => ({
    createSession: async () => "provider-target-documentation-rollover",
  });
  Object.assign(api.flowNodeContinuity, {
    buildReportPaths: () => {
      throw new Error(
        "Documentation Tree rollover must not build report paths"
      );
    },
  });
  Object.assign(api.sessionBootstrap, {
    createAndRegisterSession: (options: Record<string, unknown>) => {
      createSessionCalls.push(options);
      return Promise.resolve(targetSession);
    },
  });
  Object.assign(api.messageDispatch, {
    sendInternalMessage: (_sessionId: string, content: string) => {
      internalMessages.push({ content });
      return Promise.resolve();
    },
  });

  await api.flowNodeRollover.rolloverFlowNodeSession(
    sourceSession,
    { remainingPercent: 10, thresholdPercent: 80, rolloverId: "rollover-doc" },
    { silent: true }
  );

  assert.equal(internalMessages.length, 0);
  assert.equal(createSessionCalls.length, 1);
  assert.equal(createSessionCalls[0]?.resumeMode, "resume_via_rollover");
  assert.deepEqual(createSessionCalls[0]?.context, {
    initiativeSlug: "demo",
    stage: "diagram_modules",
    runSlug: null,
    providerSessionId: null,
  });

  const stateReader = api.flowNodeRollover as unknown as {
    readonly getDocumentationRolloverContext: (sessionId: string) => {
      readonly lastUserVisibleAssistantMessage: string | null;
      readonly providerId: string;
      readonly rolloverId: string;
      readonly sourceSessionId: string;
      readonly stageId: string;
      readonly targetSessionId: string;
      readonly workspaceSlug: string;
    } | null;
  };
  const context = stateReader.getDocumentationRolloverContext(targetSession.id);
  assert.ok(context);
  assert.equal(
    context.lastUserVisibleAssistantMessage,
    "Which module boundary should we refine next?"
  );
  assert.equal(context.providerId, "codexCli");
  assert.equal(context.rolloverId, "rollover-doc");
  assert.equal(context.sourceSessionId, sourceSession.id);
  assert.equal(context.stageId, "diagram_modules");
  assert.equal(context.targetSessionId, targetSession.id);
  assert.equal(context.workspaceSlug, "demo");
  assert.equal(countContinuityUnlocks(harness, "resume_ready"), 2);
  assert.equal(
    internals(harness.handler).continuityLockService.hasContext(
      sourceSession.id
    ),
    false
  );
  assert.equal(
    internals(harness.handler).continuityLockService.hasContext(
      targetSession.id
    ),
    false
  );
  assert.equal(harness.runtimeLockUpdates.at(-1)?.active, false);
  assert.equal(harness.runtimeLockUpdates.at(-1)?.reason, "resume_ready");
});
