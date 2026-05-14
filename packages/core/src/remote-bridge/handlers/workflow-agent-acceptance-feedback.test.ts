import assert from "node:assert/strict";
import test from "node:test";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import { Logger } from "../../telemetry/logger";
import { WorkflowAgentAcceptanceFeedback } from "./workflow-agent-acceptance-feedback";

const createChains = (
  stage: ContinuityChainSummary["stage"],
  sessionId: string
): readonly ContinuityChainSummary[] => [
  {
    rootSessionId: `codex-${stage}`,
    segments: [
      {
        createdAt: "2026-05-08T05:51:54.053Z",
        providerId: "codexCli",
        providerSessionId: `provider-${sessionId}`,
        sessionId,
      },
    ],
    stage,
    updatedAt: "2026-05-08T05:51:54.053Z",
    workspaceSlug: "demo-workspace",
  },
];

test("managed provider feedback dispatch is disabled during rewrite", async () => {
  const messages: string[] = [];
  const startedTurns: string[] = [];
  const feedback = new WorkflowAgentAcceptanceFeedback(new Logger("error"));
  const gateway = {
    handleMessage: (sessionId: string, content: unknown) => {
      messages.push(`${sessionId}:${String(content)}`);
      return Promise.resolve();
    },
    markFeedbackTurnStarted: (sessionId: string) => {
      startedTurns.push(sessionId);
    },
  };
  const commonParams = {
    gateway,
    workspaceRoot: "/tmp/rewrite-feedback-disabled",
    workspaceSlug: "demo-workspace",
  };

  await feedback.sendManagedStageFeedback({
    ...commonParams,
    chains: createChains("diagram_modules", "diagram-session"),
    request: { stage: "diagram_modules" },
  });
  await feedback.sendDiagramModulesFeedback({
    ...commonParams,
    chains: createChains("diagram_modules", "diagram-session"),
    progress: { aggregateReady: false } as never,
  });
  await feedback.sendApplicationSkeletonFeedback({
    ...commonParams,
    chains: createChains("application_skeleton", "skeleton-session"),
    progress: { materialized: false } as never,
  });
  await feedback.sendQualityGatesFeedback({
    ...commonParams,
    chains: createChains("quality_gates", "quality-session"),
    progress: { integrated: false } as never,
  });

  assert.deepEqual(messages, []);
  assert.deepEqual(startedTurns, []);
});
