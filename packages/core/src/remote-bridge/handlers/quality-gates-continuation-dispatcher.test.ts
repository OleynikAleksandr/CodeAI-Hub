import assert from "node:assert/strict";
import test from "node:test";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import { sendQualityGatesContinuationIfReady } from "./quality-gates-continuation-dispatcher";
import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";
import type { WorkflowAgentAcceptanceFeedbackGateway } from "./workflow-agent-acceptance-feedback";

const buildProgress = (): QualityGatesProgressSnapshot => ({
  accepted: true,
  commandContractReady: true,
  integrated: false,
  integrationState: "accepted",
  jsonExists: true,
  markdownExists: true,
  substep: "accepted",
  validationErrors: [],
});

test("quality gates continuation dispatcher is disabled during managed rewrite", async () => {
  const calls: string[] = [];
  const gateway: WorkflowAgentAcceptanceFeedbackGateway = {
    handleMessage: (sessionId: string) => {
      calls.push(sessionId);
      return Promise.resolve();
    },
    markFeedbackTurnStarted: (sessionId: string) => {
      calls.push(`turn:${sessionId}`);
    },
  } as unknown as WorkflowAgentAcceptanceFeedbackGateway;

  await sendQualityGatesContinuationIfReady({
    chains: [
      {
        segments: [{ sessionId: "quality-gates-session" }],
        stage: "quality_gates",
        updatedAt: "2026-05-10T12:00:00Z",
      } as unknown as ContinuityChainSummary,
    ],
    gateway,
    progress: buildProgress(),
  });

  assert.deepEqual(calls, []);
});
