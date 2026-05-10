import assert from "node:assert/strict";
import test from "node:test";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import { sendApplicationSkeletonContinuationIfReady } from "./application-skeleton-continuation-dispatcher";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import { recognizeManagedAcceptanceForStage } from "./managed-workflow-post-turn-service";
import type { WorkflowAgentAcceptanceFeedbackGateway } from "./workflow-agent-acceptance-feedback";

const STAGE = "application_skeleton";
const RESUMED_USER_PHRASING =
  "После перерыва, контракт принимаю — двигайся к материализации.";
const MATERIALIZATION_PROMPT_RE = /Begin Phase 2 materialization/u;

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
    materializationState: "not_started",
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

test("rollover preserves recogniser-eligible window for Application Skeleton phase B", () => {
  assert.equal(
    recognizeManagedAcceptanceForStage(STAGE, RESUMED_USER_PHRASING),
    "Принимаю контракт"
  );
});

test("dispatcher continues to gate by recently-accepted set across rollover", async () => {
  const resumedSessionId = "session-as-rollover-resumed";
  const calls: Array<{ readonly sessionId: string; readonly text: string }> =
    [];
  await sendApplicationSkeletonContinuationIfReady({
    chains: [buildChain(resumedSessionId)],
    gateway: buildSpyGateway(calls),
    progress: buildAwaitingAcceptanceProgress(),
    recentlyAcceptedSessions: new Set([resumedSessionId]),
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0]?.text ?? "", MATERIALIZATION_PROMPT_RE);

  const callsAfterMaterialised: Array<{
    readonly sessionId: string;
    readonly text: string;
  }> = [];
  await sendApplicationSkeletonContinuationIfReady({
    chains: [buildChain(resumedSessionId)],
    gateway: buildSpyGateway(callsAfterMaterialised),
    progress: {
      ...buildAwaitingAcceptanceProgress(),
      accepted: true,
      materialized: true,
      materializationState: "materialized",
      substep: "materialized",
    },
    recentlyAcceptedSessions: new Set([resumedSessionId]),
  });
  assert.equal(callsAfterMaterialised.length, 0);
});
