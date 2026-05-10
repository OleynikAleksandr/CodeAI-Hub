import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import { sendApplicationSkeletonContinuationIfReady } from "./application-skeleton-continuation-dispatcher";
import {
  type ApplicationSkeletonProgressSnapshot,
  readApplicationSkeletonProgressSnapshot,
} from "./application-skeleton-progress";
import {
  recognizeManagedAcceptanceForStage,
  recognizeManagedContractAcceptancePhrase,
} from "./managed-workflow-post-turn-service";
import type { WorkflowAgentAcceptanceFeedbackGateway } from "./workflow-agent-acceptance-feedback";

const STAGE = "application_skeleton";
const MATERIALIZATION_PROMPT_RE = /Begin Phase 2 materialization/u;

const buildChain = (sessionId: string): ContinuityChainSummary =>
  ({
    chainId: `chain-${sessionId}`,
    stage: STAGE,
    segments: [{ sessionId, sequence: 0, isCurrent: true }],
    updatedAt: "2026-05-10T12:00:00Z",
  }) as unknown as ContinuityChainSummary;

const writeSkeleton = async (params: {
  readonly map: Record<string, unknown>;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  const stageDir = path.join(
    params.workspaceRoot,
    `.codeai-hub/${params.workspaceSlug}/application_skeleton`
  );
  await mkdir(stageDir, { recursive: true });
  await writeFile(
    path.join(stageDir, "application-skeleton.md"),
    "# Application Skeleton\n",
    "utf8"
  );
  await writeFile(
    path.join(stageDir, "application-skeleton-map.json"),
    `${JSON.stringify(params.map, null, 2)}\n`,
    "utf8"
  );
};

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

test("application skeleton happy path: recogniser → dispatcher → completion observer", async () => {
  const userMessage = "Контракт принимаю, можешь двигаться к фазе 2.";
  const phrase = recognizeManagedContractAcceptancePhrase(userMessage);
  assert.equal(phrase, "Принимаю контракт");
  assert.equal(
    recognizeManagedAcceptanceForStage(STAGE, userMessage),
    "Принимаю контракт"
  );
  assert.equal(
    recognizeManagedAcceptanceForStage("description", userMessage),
    null
  );

  const sessionId = "session-as-e2e";
  const calls: Array<{ readonly sessionId: string; readonly text: string }> =
    [];
  const gateway: WorkflowAgentAcceptanceFeedbackGateway = {
    handleMessage: (id: string, text: string) => {
      calls.push({ sessionId: id, text });
      return Promise.resolve();
    },
    markFeedbackTurnStarted: () => undefined,
  } as unknown as WorkflowAgentAcceptanceFeedbackGateway;

  await sendApplicationSkeletonContinuationIfReady({
    chains: [buildChain(sessionId)],
    gateway,
    progress: buildAwaitingAcceptanceProgress(),
    recentlyAcceptedSessions: new Set([sessionId]),
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0]?.sessionId, sessionId);
  assert.match(calls[0]?.text ?? "", MATERIALIZATION_PROMPT_RE);

  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "application-skeleton-e2e-")
  );
  const workspaceSlug = "demo";
  try {
    await writeSkeleton({
      workspaceRoot,
      workspaceSlug,
      map: {
        schema: "codeai-application-skeleton-v1",
        accepted: true,
        materialized: true,
        materializationState: "materialized",
        reviewState: "materialized",
        productParts: [],
        materializedPaths: [],
      },
    });
    const finalProgress = await readApplicationSkeletonProgressSnapshot({
      workspaceRoot,
      workspaceSlug,
    });
    assert.equal(finalProgress?.materialized, true);
    assert.equal(finalProgress?.substep, "materialized");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
