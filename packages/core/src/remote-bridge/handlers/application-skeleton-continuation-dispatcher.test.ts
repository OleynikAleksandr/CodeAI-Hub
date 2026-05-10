import assert from "node:assert/strict";
import test from "node:test";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import { sendApplicationSkeletonContinuationIfReady } from "./application-skeleton-continuation-dispatcher";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import type { WorkflowAgentAcceptanceFeedbackGateway } from "./workflow-agent-acceptance-feedback";

const MATERIALIZATION_PROMPT_RE = /Begin Phase 2 materialization/u;

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
  accepted: false,
  mapExists: true,
  mappingReady: true,
  markdownExists: true,
  materializationState:
    "not_started" as ApplicationSkeletonProgressSnapshot["materializationState"],
  materialized: false,
  observedMaterialization: false,
  substep: "awaiting_acceptance",
  validationErrors: [],
  ...overrides,
});

const createSpyGateway = (): {
  readonly gateway: WorkflowAgentAcceptanceFeedbackGateway;
  readonly calls: Array<{ readonly sessionId: string; readonly text: string }>;
  readonly turnStarts: string[];
} => {
  const calls: Array<{ readonly sessionId: string; readonly text: string }> =
    [];
  const turnStarts: string[] = [];
  const gateway: WorkflowAgentAcceptanceFeedbackGateway = {
    handleMessage: (sessionId: string, text: string) => {
      calls.push({ sessionId, text });
      return Promise.resolve();
    },
    markFeedbackTurnStarted: (sessionId: string) => {
      turnStarts.push(sessionId);
    },
  } as unknown as WorkflowAgentAcceptanceFeedbackGateway;
  return { gateway, calls, turnStarts };
};

test("dispatcher fires materialization prompt when accepted session is awaiting acceptance", async () => {
  const sessionId = "session-as-fire";
  const { gateway, calls, turnStarts } = createSpyGateway();
  await sendApplicationSkeletonContinuationIfReady({
    chains: [buildChain(sessionId)],
    gateway,
    progress: buildProgress(),
    recentlyAcceptedSessions: new Set([sessionId]),
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.sessionId, sessionId);
  assert.match(calls[0]?.text ?? "", MATERIALIZATION_PROMPT_RE);
  assert.deepEqual(turnStarts, [sessionId]);
});

test("dispatcher is a no-op when session is not in recently-accepted set", async () => {
  const sessionId = "session-as-noaccept";
  const { gateway, calls } = createSpyGateway();
  await sendApplicationSkeletonContinuationIfReady({
    chains: [buildChain(sessionId)],
    gateway,
    progress: buildProgress(),
    recentlyAcceptedSessions: new Set(),
  });
  assert.equal(calls.length, 0);
});

test("dispatcher is a no-op when progress is already materialized", async () => {
  const sessionId = "session-as-materialized";
  const { gateway, calls } = createSpyGateway();
  await sendApplicationSkeletonContinuationIfReady({
    chains: [buildChain(sessionId)],
    gateway,
    progress: buildProgress({
      substep: "materialized",
      materialized: true,
      accepted: true,
    }),
    recentlyAcceptedSessions: new Set([sessionId]),
  });
  assert.equal(calls.length, 0);
});

test("dispatcher does not double-fire for the same session and substep", async () => {
  const sessionId = "session-as-dedup";
  const { gateway, calls } = createSpyGateway();
  const params = {
    chains: [buildChain(sessionId)],
    gateway,
    progress: buildProgress(),
    recentlyAcceptedSessions: new Set([sessionId]),
  };
  await sendApplicationSkeletonContinuationIfReady(params);
  await sendApplicationSkeletonContinuationIfReady(params);
  assert.equal(calls.length, 1);
});

test("dispatcher is a no-op when no gateway is provided", async () => {
  const sessionId = "session-as-no-gateway";
  await sendApplicationSkeletonContinuationIfReady({
    chains: [buildChain(sessionId)],
    progress: buildProgress(),
    recentlyAcceptedSessions: new Set([sessionId]),
  });
});

test("dispatcher is a no-op when no chain matches Application Skeleton stage", async () => {
  const sessionId = "session-as-no-chain";
  const { gateway, calls } = createSpyGateway();
  const otherStageChain = {
    chainId: "chain-other",
    stage: "diagram_modules",
    segments: [{ sessionId, sequence: 0, isCurrent: true }],
    updatedAt: "2026-05-10T12:00:00Z",
  } as unknown as ContinuityChainSummary;
  await sendApplicationSkeletonContinuationIfReady({
    chains: [otherStageChain],
    gateway,
    progress: buildProgress(),
    recentlyAcceptedSessions: new Set([sessionId]),
  });
  assert.equal(calls.length, 0);
});

test("dispatcher is a no-op for an incomplete `artifact` substep even with the accept marker", async () => {
  // Phase 6 task3 invariant: a session that the user typed an acceptance
  // phrase for must not flip into materialization until the draft is at least
  // structurally complete (`awaiting_acceptance`). The accept marker guards
  // who can authorize Phase 2; the substep guards what stage the agent is at.
  const sessionId = "session-as-incomplete-draft";
  const { gateway, calls } = createSpyGateway();
  await sendApplicationSkeletonContinuationIfReady({
    chains: [buildChain(sessionId)],
    gateway,
    progress: buildProgress({ substep: "artifact" }),
    recentlyAcceptedSessions: new Set([sessionId]),
  });
  assert.equal(calls.length, 0);
});

test("dispatcher is a no-op when stage is already materialized (premature flip)", async () => {
  const sessionId = "session-as-already-materialized";
  const { gateway, calls } = createSpyGateway();
  await sendApplicationSkeletonContinuationIfReady({
    chains: [buildChain(sessionId)],
    gateway,
    progress: buildProgress({ materialized: true, substep: "materialized" }),
    recentlyAcceptedSessions: new Set([sessionId]),
  });
  assert.equal(calls.length, 0);
});
