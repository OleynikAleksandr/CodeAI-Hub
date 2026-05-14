import assert from "node:assert/strict";
import test from "node:test";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import { sendApplicationSkeletonContinuationIfReady } from "./application-skeleton-continuation-dispatcher";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import type { WorkflowAgentAcceptanceFeedbackGateway } from "./workflow-agent-acceptance-feedback";

const buildChain = (sessionId: string): ContinuityChainSummary =>
  ({
    chainId: `chain-${sessionId}`,
    stage: "application_skeleton",
    segments: [{ sessionId, sequence: 0, isCurrent: true }],
    updatedAt: "2026-05-10T12:00:00Z",
  }) as unknown as ContinuityChainSummary;

const buildProgress = (
  overrides: Partial<ApplicationSkeletonProgressSnapshot> = {}
): ApplicationSkeletonProgressSnapshot => ({
  accepted: true,
  mapExists: true,
  mappingReady: true,
  markdownExists: true,
  materializationState: "accepted",
  materialized: false,
  observedMaterialization: false,
  substep: "accepted",
  validationErrors: [],
  ...overrides,
});

const createSpyGateway = (): {
  readonly gateway: WorkflowAgentAcceptanceFeedbackGateway;
  readonly messages: Array<{
    readonly sessionId: string;
    readonly text: string;
  }>;
  readonly turnStarts: string[];
} => {
  const messages: Array<{ readonly sessionId: string; readonly text: string }> =
    [];
  const turnStarts: string[] = [];
  const gateway: WorkflowAgentAcceptanceFeedbackGateway = {
    handleMessage: (sessionId: string, text: string) => {
      messages.push({ sessionId, text });
      return Promise.resolve();
    },
    markFeedbackTurnStarted: (sessionId: string) => {
      turnStarts.push(sessionId);
    },
  } as unknown as WorkflowAgentAcceptanceFeedbackGateway;
  return { gateway, messages, turnStarts };
};

test("dispatcher does not send materialization continuation while orchestration is disabled", async () => {
  const sessionId = "session-as-disabled";
  const { gateway, messages, turnStarts } = createSpyGateway();

  await sendApplicationSkeletonContinuationIfReady({
    chains: [buildChain(sessionId)],
    gateway,
    progress: buildProgress(),
  });

  assert.deepEqual(messages, []);
  assert.deepEqual(turnStarts, []);
});

test("dispatcher ignores recently accepted sessions while orchestration is disabled", async () => {
  const sessionId = "session-as-recently-accepted";
  const { gateway, messages, turnStarts } = createSpyGateway();

  await sendApplicationSkeletonContinuationIfReady({
    chains: [buildChain(sessionId)],
    gateway,
    progress: buildProgress({
      accepted: false,
      substep: "awaiting_acceptance",
    }),
    recentlyAcceptedSessions: new Set([sessionId]),
  });

  assert.deepEqual(messages, []);
  assert.deepEqual(turnStarts, []);
});

test("dispatcher remains a no-op without a gateway", async () => {
  await sendApplicationSkeletonContinuationIfReady({
    chains: [buildChain("session-as-no-gateway")],
    progress: buildProgress(),
  });
});
