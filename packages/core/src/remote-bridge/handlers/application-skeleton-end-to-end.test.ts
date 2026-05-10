import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import { sendApplicationSkeletonContinuationIfReady } from "./application-skeleton-continuation-dispatcher";
import { evaluateApplicationSkeletonContractGuard } from "./application-skeleton-contract-guard";
import { classifyApplicationSkeletonPhase } from "./application-skeleton-phase-state";
import { evaluateApplicationSkeletonPrematureMaterialization } from "./application-skeleton-premature-materialization-validator";
import {
  type ApplicationSkeletonProgressSnapshot,
  readApplicationSkeletonProgressSnapshot,
} from "./application-skeleton-progress";
import { classifyApplicationSkeletonReviewTurn } from "./application-skeleton-review-turn-classifier";
import type { ManagedGitStatus } from "./managed-git-stage-gate";
import { evaluateApplicationSkeletonAcceptContractCommand } from "./managed-stage-accept-contract-handler";
import {
  recognizeManagedAcceptanceForStage,
  recognizeManagedContractAcceptancePhrase,
} from "./managed-workflow-post-turn-service";
import type { WorkflowAgentAcceptanceFeedbackGateway } from "./workflow-agent-acceptance-feedback";

const buildGitStatus = (
  applicationSkeleton: readonly string[] = []
): ManagedGitStatus =>
  ({
    clean: applicationSkeleton.length === 0,
    dirtyByStage: {
      application_skeleton: applicationSkeleton,
      diagram_modules: [],
      quality_gates: [],
    },
    dirtyFiles: applicationSkeleton,
  }) as unknown as ManagedGitStatus;

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
    materializationState: "artifact",
    materialized: false,
    observedMaterialization: false,
    substep: "awaiting_acceptance",
    validationErrors: [],
  });

test("application skeleton A→B→A pipeline: classifier, guard, premature, review classifier, accept handler", () => {
  // Phase 1A draft state (markdown only, map missing) → guard fires
  // repair_no_progress when there is no owned diff; otherwise repair_invalid_draft.
  const phase1aProgress = {
    accepted: false,
    mapExists: false,
    mappingReady: false,
    markdownExists: false,
    materializationState: "artifact" as const,
    materialized: false,
    observedMaterialization: false,
    substep: "artifact" as const,
    validationErrors: [],
  } satisfies ApplicationSkeletonProgressSnapshot;
  assert.equal(
    classifyApplicationSkeletonPhase(phase1aProgress),
    "phase_1a_draft"
  );
  const guardNoProgress = evaluateApplicationSkeletonContractGuard({
    ownedDirtyFiles: [],
    phase: "phase_1a_draft",
    progress: phase1aProgress,
    terminalEventReceived: true,
  });
  assert.equal(guardNoProgress.kind, "repair_no_progress");

  // Phase 1B review state (draft Core-clean, awaiting acceptance).
  const phase1bProgress = {
    ...phase1aProgress,
    mapExists: true,
    mappingReady: true,
    markdownExists: true,
    substep: "awaiting_acceptance" as const,
  };
  assert.equal(
    classifyApplicationSkeletonPhase(phase1bProgress),
    "phase_1b_review"
  );
  // Discussion turn (no owned diff) → review classifier returns discussion.
  assert.equal(
    classifyApplicationSkeletonReviewTurn({
      ownedDirtyFiles: [],
      phase: "phase_1b_review",
    }),
    "discussion"
  );
  // Artifact-changing review turn → revision.
  assert.equal(
    classifyApplicationSkeletonReviewTurn({
      ownedDirtyFiles: [
        ".codeai-hub/demo/application_skeleton/application-skeleton.md",
      ],
      phase: "phase_1b_review",
    }),
    "revision"
  );

  // Premature materialization touch in Phase 1B → blocked.
  const prematureBlocked = evaluateApplicationSkeletonPrematureMaterialization({
    accepted: false,
    mapJson: {
      materializedPaths: ["product-parts/demo"],
      productParts: [{ codePath: "product-parts/demo" }],
      schema: "codeai-application-skeleton-v1",
    },
    ownedDirtyFiles: ["product-parts/demo/README.md"],
  });
  assert.equal(prematureBlocked.kind, "blocked");
  // Guard wired to that premature decision returns repair_premature_materialization.
  const guardPremature = evaluateApplicationSkeletonContractGuard({
    ownedDirtyFiles: ["product-parts/demo/README.md"],
    phase: "phase_1b_review",
    prematureDecision: prematureBlocked,
    progress: phase1bProgress,
    terminalEventReceived: true,
  });
  assert.equal(guardPremature.kind, "repair_premature_materialization");

  // Accept-contract command on a clean Phase 1B state → accepted.
  const acceptDecision = evaluateApplicationSkeletonAcceptContractCommand({
    applicationSkeletonProgress: phase1bProgress,
    managedGitStatus: buildGitStatus(),
    phase: "phase_1b_review",
  });
  assert.equal(acceptDecision.kind, "accepted");
  // Accept-contract command on a still-pending revision → rejected.
  const acceptRejected = evaluateApplicationSkeletonAcceptContractCommand({
    applicationSkeletonProgress: phase1bProgress,
    managedGitStatus: buildGitStatus([
      ".codeai-hub/demo/application_skeleton/application-skeleton.md",
    ]),
    phase: "phase_1b_review",
  });
  assert.equal(acceptRejected.kind, "rejected");
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
