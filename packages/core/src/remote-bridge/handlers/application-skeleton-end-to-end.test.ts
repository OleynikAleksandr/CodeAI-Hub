import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { evaluateApplicationSkeletonContractGuard } from "./application-skeleton-contract-guard";
import { classifyApplicationSkeletonPhase } from "./application-skeleton-phase-state";
import { evaluateApplicationSkeletonPrematureMaterialization } from "./application-skeleton-premature-materialization-validator";
import {
  type ApplicationSkeletonProgressSnapshot,
  readApplicationSkeletonProgressSnapshot,
} from "./application-skeleton-progress";
import { classifyApplicationSkeletonReviewTurn } from "./application-skeleton-review-turn-classifier";
import type { ManagedGitStatus } from "./managed-git-stage-gate";

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

test("application skeleton draft/review pipeline stays validation-only during rewrite", () => {
  // Phase 1A draft state (markdown only, map missing) → guard fires
  // repair_no_progress when there is no owned diff; otherwise repair_invalid_draft.
  const phase1Progress = {
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
    classifyApplicationSkeletonPhase(phase1Progress),
    "phase_1_draft"
  );
  const guardNoProgress = evaluateApplicationSkeletonContractGuard({
    ownedDirtyFiles: [],
    phase: "phase_1_draft",
    progress: phase1Progress,
    terminalEventReceived: true,
  });
  assert.equal(guardNoProgress.kind, "repair_no_progress");

  // Phase 1B review state (draft Core-clean, awaiting acceptance).
  const phase2Progress = {
    ...phase1Progress,
    mapExists: true,
    mappingReady: true,
    markdownExists: true,
    substep: "awaiting_acceptance" as const,
  };
  assert.equal(
    classifyApplicationSkeletonPhase(phase2Progress),
    "phase_2_review"
  );
  // Discussion turn (no owned diff) → review classifier returns discussion.
  assert.equal(
    classifyApplicationSkeletonReviewTurn({
      ownedDirtyFiles: [],
      phase: "phase_2_review",
    }),
    "discussion"
  );
  // Artifact-changing review turn → revision.
  assert.equal(
    classifyApplicationSkeletonReviewTurn({
      ownedDirtyFiles: [
        ".codeai-hub/demo/application_skeleton/application-skeleton.md",
      ],
      phase: "phase_2_review",
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
    phase: "phase_2_review",
    prematureDecision: prematureBlocked,
    progress: phase2Progress,
    terminalEventReceived: true,
  });
  assert.equal(guardPremature.kind, "repair_premature_materialization");

  assert.equal(buildGitStatus().clean, true);
  assert.equal(
    buildGitStatus([
      ".codeai-hub/demo/application_skeleton/application-skeleton.md",
    ]).clean,
    false
  );
});

test("application skeleton materialized progress remains observable without accept orchestration", async () => {
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
