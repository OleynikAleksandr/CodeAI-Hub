import assert from "node:assert/strict";
import test from "node:test";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import { sendQualityGatesContinuationIfReady } from "./quality-gates-continuation-dispatcher";
import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";
import type { WorkflowAgentAcceptanceFeedbackGateway } from "./workflow-agent-acceptance-feedback";

const INTEGRATION_PROMPT_RE = /Begin Phase 3 integration/u;

const buildChain = (sessionId: string): ContinuityChainSummary =>
  ({
    chainId: `chain-${sessionId}`,
    stage: "quality_gates",
    segments: [{ sessionId, sequence: 0, isCurrent: true }],
    updatedAt: "2026-05-10T12:00:00Z",
  }) as unknown as ContinuityChainSummary;

const buildProgress = (
  overrides: Partial<QualityGatesProgressSnapshot> = {}
): QualityGatesProgressSnapshot => ({
  accepted: true,
  acceptanceCommitted: true,
  commandContractReady: true,
  integrated: false,
  integrationState: "accepted",
  jsonExists: true,
  markdownExists: true,
  substep: "accepted",
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

test("dispatcher fires integration prompt when accepted and acceptanceCommitted both true", async () => {
  const sessionId = "session-qg-fire";
  const { gateway, calls, turnStarts } = createSpyGateway();
  await sendQualityGatesContinuationIfReady({
    chains: [buildChain(sessionId)],
    gateway,
    progress: buildProgress(),
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.sessionId, sessionId);
  assert.match(calls[0]?.text ?? "", INTEGRATION_PROMPT_RE);
  assert.deepEqual(turnStarts, [sessionId]);
});

test("dispatcher is a no-op until acceptance commit evidence is present", async () => {
  const sessionId = "session-qg-uncommitted-acceptance";
  const { gateway, calls } = createSpyGateway();
  await sendQualityGatesContinuationIfReady({
    chains: [buildChain(sessionId)],
    gateway,
    progress: buildProgress({ acceptanceCommitted: false }),
  });
  assert.equal(calls.length, 0);
});

test("dispatcher is a no-op when progress.accepted is false", async () => {
  const sessionId = "session-qg-noaccept";
  const { gateway, calls } = createSpyGateway();
  await sendQualityGatesContinuationIfReady({
    chains: [buildChain(sessionId)],
    gateway,
    progress: buildProgress({
      accepted: false,
      acceptanceCommitted: false,
      substep: "awaiting_acceptance",
    }),
  });
  assert.equal(calls.length, 0);
});

test("dispatcher is a no-op when progress is already integrated", async () => {
  const sessionId = "session-qg-integrated";
  const { gateway, calls } = createSpyGateway();
  await sendQualityGatesContinuationIfReady({
    chains: [buildChain(sessionId)],
    gateway,
    progress: buildProgress({ integrated: true, substep: "integrated" }),
  });
  assert.equal(calls.length, 0);
});

test("dispatcher does not refire the same prompt for the same session/substep pair", async () => {
  const sessionId = "session-qg-dedup";
  const { gateway, calls } = createSpyGateway();
  await sendQualityGatesContinuationIfReady({
    chains: [buildChain(sessionId)],
    gateway,
    progress: buildProgress(),
  });
  await sendQualityGatesContinuationIfReady({
    chains: [buildChain(sessionId)],
    gateway,
    progress: buildProgress(),
  });
  assert.equal(calls.length, 1);
});

test("dispatcher refuses integration prompt before acceptance commit lands", async () => {
  const sessionId = "session-qg-pre-commit";
  const { gateway, calls } = createSpyGateway();
  await sendQualityGatesContinuationIfReady({
    chains: [buildChain(sessionId)],
    gateway,
    progress: buildProgress({
      accepted: true,
      acceptanceCommitted: false,
      substep: "accepted",
    }),
  });
  assert.equal(
    calls.length,
    0,
    "integration prompt must wait for `acceptanceCommitted: true`"
  );
});
