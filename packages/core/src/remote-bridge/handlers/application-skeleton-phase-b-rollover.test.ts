import assert from "node:assert/strict";
import test from "node:test";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import { sendApplicationSkeletonContinuationIfReady } from "./application-skeleton-continuation-dispatcher";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import type { WorkflowAgentAcceptanceFeedbackGateway } from "./workflow-agent-acceptance-feedback";

const STAGE = "application_skeleton";

const buildChain = (sessionId: string): ContinuityChainSummary =>
  ({
    chainId: `chain-${sessionId}`,
    stage: STAGE,
    segments: [
      { sessionId: `${sessionId}-source`, sequence: 0, isCurrent: false },
      { sessionId, sequence: 1, isCurrent: true },
    ],
    updatedAt: "2026-05-10T13:00:00Z",
  }) as unknown as ContinuityChainSummary;

const buildAwaitingAcceptanceProgress =
  (): ApplicationSkeletonProgressSnapshot => ({
    accepted: false,
    mapExists: true,
    mappingReady: true,
    markdownExists: true,
    materializationState: "artifact",
    materialized: false,
    observedMaterialization: false,
    substep: "awaiting_acceptance",
    validationErrors: [],
  });

const buildSpyGateway = (
  calls: Array<{ readonly sessionId: string; readonly text: string }>
): WorkflowAgentAcceptanceFeedbackGateway =>
  ({
    handleMessage: (id: string, text: string) => {
      calls.push({ sessionId: id, text });
      return Promise.resolve();
    },
    markFeedbackTurnStarted: () => undefined,
  }) as unknown as WorkflowAgentAcceptanceFeedbackGateway;

test("dispatcher does not continue from recently-accepted set during rewrite", async () => {
  const resumedSessionId = "session-as-rollover-resumed";
  const calls: Array<{ readonly sessionId: string; readonly text: string }> =
    [];
  await sendApplicationSkeletonContinuationIfReady({
    chains: [buildChain(resumedSessionId)],
    gateway: buildSpyGateway(calls),
    progress: buildAwaitingAcceptanceProgress(),
    recentlyAcceptedSessions: new Set([resumedSessionId]),
  });

  assert.deepEqual(calls, []);
});
