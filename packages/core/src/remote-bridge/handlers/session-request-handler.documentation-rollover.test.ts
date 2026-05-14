import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  useProductionFlowNodeHandler as activateProductionFlowNodeHandler,
  emitProviderEvent,
  setLifecycle,
  stubDescriptionDialogSync,
} from "./session-request-handler.test-continuity-helpers";
import { countContinuityUnlocks } from "./session-request-handler.test-event-helpers";
import {
  createHarness,
  flushAsyncWork,
  internals,
  noop,
} from "./session-request-handler.test-helpers";

const REWRITE_BLOCKED_STAGES = new Set([
  "application_skeleton",
  "diagram_modules",
  "quality_gates",
]);

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
  const reportStateReader = api as unknown as {
    readonly flowNodeReportState: {
      readonly getCreateReportRequest: (sessionId: string) => unknown;
      readonly registerCreateReportRequest: (options: {
        readonly attempt: number;
        readonly reportPath: string;
        readonly requestId: string;
        readonly sessionId: string;
        readonly tmpReportPath: string;
      }) => void;
    };
  };
  reportStateReader.flowNodeReportState.registerCreateReportRequest({
    sessionId: sourceSession.id,
    requestId: "stale-report-request",
    attempt: 1,
    reportPath: "/tmp/stale-report.md",
    tmpReportPath: "/tmp/stale-report.tmp.md",
  });

  await api.flowNodeRollover.rolloverFlowNodeSession(
    sourceSession,
    { remainingPercent: 10, thresholdPercent: 80, rolloverId: "rollover-doc" },
    { silent: true }
  );

  assert.equal(internalMessages.length, 0);
  assert.equal(
    reportStateReader.flowNodeReportState.getCreateReportRequest(
      sourceSession.id
    ),
    null
  );
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

test("Documentation Tree production rollover waits for next user turn before continuation envelope", async () => {
  const previousHome = process.env.HOME;
  const tempHome = await mkdtemp(path.join(tmpdir(), "codeai-doc-prod-"));
  try {
    process.env.HOME = tempHome;
    for (const stage of [
      "description",
      "virtual_simulation",
      "diagram_modules",
      "application_skeleton",
      "quality_gates",
    ] as const) {
      const harness = createHarness();
      const workspacePath = path.join(tempHome, `workspace-${stage}`);
      stubDescriptionDialogSync(harness);
      const providerSends: Array<{
        readonly content: string;
        readonly providerSessionId: string;
      }> = [];
      const internalMessages: string[] = [];
      const sourceSession = harness.sessionManager.createSession(
        "codexCli",
        workspacePath,
        `provider-source-${stage}`,
        {
          initiativeSlug: "demo",
          stage,
          runSlug: null,
        }
      );
      harness.sessionManager.appendMessage(
        sourceSession.id,
        "assistant",
        `Question before rollover for ${stage}?`
      );
      setLifecycle(harness, sourceSession.id, "resume_in_place");
      activateProductionFlowNodeHandler(harness);
      const api = internals(harness.handler);
      api.resolveLiveContinuityRemainingPercentThreshold = async () => 80;
      api.turnArbitration.resolveLiveContinuityRemainingPercentThreshold =
        async () => 80;
      Object.assign(api.flowNodeContinuity, {
        buildReportPaths: () => {
          throw new Error(
            "Documentation Tree production rollover must not build report paths"
          );
        },
        waitForReport: () => {
          throw new Error(
            "Documentation Tree production rollover must not wait for report"
          );
        },
      });
      Object.assign(api.messageDispatch, {
        sendInternalMessage: (_sessionId: string, content: string) => {
          internalMessages.push(content);
          return Promise.resolve();
        },
      });
      harness.providerRegistry.getAdapter = () => ({
        createSession: async () => `provider-target-${stage}`,
        sendMessage: (providerSessionId: string, content: string) => {
          providerSends.push({ providerSessionId, content });
          return Promise.resolve();
        },
        subscribe: () => noop,
      });

      emitProviderEvent(harness, sourceSession.id, {
        type: "turn_completed",
      });
      await flushAsyncWork();
      emitProviderEvent(harness, sourceSession.id, {
        type: "stream_event",
        data: { kind: "token_usage", used: 95_000, limit: 100_000 },
        tokenUsage: { used: 95_000, limit: 100_000 },
      });
      await flushAsyncWork();
      await flushAsyncWork();

      assert.deepEqual(internalMessages, []);
      assert.equal(providerSends.length, 0);
      assert.equal(countContinuityUnlocks(harness, "resume_ready"), 2);

      const targetSession = harness.sessionManager
        .listSessions()
        .find((session) => session.id !== sourceSession.id);
      assert.ok(targetSession, `Expected target session for ${stage}`);

      const userMessage = `User answer after rollover for ${stage}.`;
      await harness.handler.handleMessage(targetSession.id, userMessage);
      await flushAsyncWork();
      await flushAsyncWork();

      if (REWRITE_BLOCKED_STAGES.has(stage)) {
        assert.equal(providerSends.length, 0);
        assert.equal(targetSession.messages.at(-1)?.content, userMessage);
        assert.ok(
          harness.events.some((event) => {
            if (event.type !== "session:error") {
              return false;
            }
            const payload = event.payload as {
              readonly code?: unknown;
              readonly sessionId?: unknown;
            };
            return (
              payload.sessionId === targetSession.id &&
              payload.code === "technical_stage_rewrite_in_progress"
            );
          }),
          `Expected technical-stage rewrite blocker for ${stage}`
        );
        continue;
      }

      assert.equal(
        providerSends.length,
        1,
        `Expected one provider send after rollover user turn for ${stage}`
      );
      const firstSend = providerSends.at(0);
      assert.ok(firstSend);
      assert.equal(firstSend.providerSessionId, `provider-target-${stage}`);
      assert.equal(firstSend.content.includes("## Continuation Mode"), true);
      assert.equal(firstSend.content.includes("not a cold start"), true);
      assert.equal(
        firstSend.content.includes(`Question before rollover for ${stage}?`),
        true
      );
      assert.equal(firstSend.content.includes(userMessage), true);
      assert.equal(targetSession.messages.at(-1)?.content, userMessage);
    }
  } finally {
    if (previousHome === undefined) {
      process.env.HOME = undefined;
    } else {
      process.env.HOME = previousHome;
    }
    await rm(tempHome, { recursive: true, force: true });
  }
});

test("Documentation stages do not emit technical Artifact Mode marker in rollover envelope", async () => {
  const { buildDocumentationContinuationEnvelope } = await import(
    "./session-request-handler-documentation-continuation-envelope"
  );

  const description = await buildDocumentationContinuationEnvelope({
    context: {
      createdAtIso: "2026-05-09T00:00:00.000Z",
      lastUserVisibleAssistantMessage: "Previous description text",
      modelBinding: null,
      providerId: "claudeCodeCli",
      rolloverId: "rollover",
      runSlug: null,
      sourceSessionId: "source",
      stageId: "description",
      targetSessionId: "target",
      workspacePath: "/tmp/documentation-description",
      workspaceSlug: "demo",
    },
    userMessage: "next user instruction",
  });
  assert.equal(description.includes("## Artifact Mode"), false);
  assert.equal(
    description.includes("artifact_mode: resume_current_stage_target"),
    false
  );

  const virtualSim = await buildDocumentationContinuationEnvelope({
    context: {
      createdAtIso: "2026-05-09T00:00:00.000Z",
      lastUserVisibleAssistantMessage: "Previous virtual simulation text",
      modelBinding: null,
      providerId: "codexCli",
      rolloverId: "rollover",
      runSlug: null,
      sourceSessionId: "source",
      stageId: "virtual_simulation",
      targetSessionId: "target",
      workspacePath: "/tmp/documentation-virtual",
      workspaceSlug: "demo",
    },
    userMessage: "next user instruction",
  });
  assert.equal(virtualSim.includes("## Artifact Mode"), false);
});
