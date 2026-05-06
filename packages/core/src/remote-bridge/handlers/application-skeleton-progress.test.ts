import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { WorkflowState } from "../../workflow/state/workflow-state-types";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";
import { readApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import {
  applyTechnicalRootProgressToState,
  resolveWorkflowBlockedStages,
} from "./quality-gates-progress";

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const createState = (workspaceSlug: string): WorkflowState => {
  const stages = Object.fromEntries(
    (
      [
        "description",
        "virtual_simulation",
        "diagram_modules",
        "application_skeleton",
        "quality_gates",
      ] as const satisfies readonly WorkflowStageId[]
    ).map((stage) => [
      stage,
      {
        artifacts:
          stage === "virtual_simulation"
            ? [
                {
                  path: ".codeai-hub/demo/virtual_simulation/virtual-simulation.md",
                  updatedAt: "2026-05-06T00:00:00.000Z",
                },
              ]
            : [],
        gates: [],
        stage,
        status: stage === "application_skeleton" ? "completed" : "idle",
        updatedAt: "2026-05-06T00:00:00.000Z",
      },
    ])
  ) as unknown as WorkflowState["stages"];
  return {
    gates: [],
    stages,
    updatedAt: "2026-05-06T00:00:00.000Z",
    workspaceSlug,
  };
};

const writeSkeleton = async (params: {
  readonly map: Record<string, unknown>;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  await writeWorkspaceFile(
    params.workspaceRoot,
    `.codeai-hub/${params.workspaceSlug}/application_skeleton/application-skeleton.md`,
    "# Application Skeleton\n"
  );
  await writeWorkspaceFile(
    params.workspaceRoot,
    `.codeai-hub/${params.workspaceSlug}/application_skeleton/application-skeleton-map.json`,
    `${JSON.stringify(params.map, null, 2)}\n`
  );
};

test("accepted application skeleton remains in progress until materialized", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "application-skeleton-progress-accepted-")
  );
  const workspaceSlug = "demo";

  try {
    await writeSkeleton({
      workspaceRoot,
      workspaceSlug,
      map: {
        schema: "codeai-application-skeleton-v1",
        accepted: true,
        materialized: false,
        materializationState: "not_started",
        productParts: [],
      },
    });

    const progress = await readApplicationSkeletonProgressSnapshot({
      workspaceRoot,
      workspaceSlug,
    });
    assert.equal(progress?.accepted, true);
    assert.equal(progress?.materialized, false);
    assert.equal(progress?.substep, "accepted");

    const state = createState(workspaceSlug);
    const updated = applyTechnicalRootProgressToState({
      applicationSkeletonProgress: progress,
      qualityGatesProgress: null,
      state,
    });
    const blocked = resolveWorkflowBlockedStages({
      applicationSkeletonProgress: progress,
      description: {
        finalPath: ".codeai-hub/demo/description/Final_Description.md",
      },
      diagramModulesProgress: {
        aggregateReady: true,
        generatedCount: 1,
        generatedPartIds: ["project-manager"],
        plannedCount: 1,
        plannedPartIds: ["project-manager"],
        substep: "awaiting_review",
      },
      state: updated,
    });

    assert.equal(updated.stages.application_skeleton.status, "in_progress");
    assert.equal(blocked.quality_gates, true);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("materialized application skeleton completes stage and unlocks quality gates", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "application-skeleton-progress-materialized-")
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
        materializedPaths: ["src/product-parts/project-manager"],
        productParts: [],
      },
    });

    const progress = await readApplicationSkeletonProgressSnapshot({
      workspaceRoot,
      workspaceSlug,
    });
    assert.equal(progress?.accepted, true);
    assert.equal(progress?.materialized, true);
    assert.equal(progress?.substep, "materialized");

    const state = createState(workspaceSlug);
    const updated = applyTechnicalRootProgressToState({
      applicationSkeletonProgress: progress,
      qualityGatesProgress: null,
      state,
    });
    const blocked = resolveWorkflowBlockedStages({
      applicationSkeletonProgress: progress,
      description: {
        finalPath: ".codeai-hub/demo/description/Final_Description.md",
      },
      diagramModulesProgress: {
        aggregateReady: true,
        generatedCount: 1,
        generatedPartIds: ["project-manager"],
        plannedCount: 1,
        plannedPartIds: ["project-manager"],
        substep: "awaiting_review",
      },
      state: updated,
    });

    assert.equal(updated.stages.application_skeleton.status, "completed");
    assert.equal(blocked.quality_gates, false);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
