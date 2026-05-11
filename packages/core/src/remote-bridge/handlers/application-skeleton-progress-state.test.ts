import assert from "node:assert/strict";
import test from "node:test";
import type { WorkflowState } from "../../workflow/state/workflow-state-types";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";
import {
  applyTechnicalRootProgressToState,
  resolveWorkflowBlockedStages,
} from "./quality-gates-progress";

const UPDATED_AT = "2026-05-06T00:00:00.000Z";

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
          stage === "application_skeleton"
            ? [
                {
                  path: ".codeai-hub/demo/application_skeleton/application-skeleton.md",
                  updatedAt: UPDATED_AT,
                },
              ]
            : [],
        gates: [],
        stage,
        status: stage === "application_skeleton" ? "completed" : "idle",
        updatedAt: UPDATED_AT,
      },
    ])
  ) as unknown as WorkflowState["stages"];
  return { gates: [], stages, updatedAt: UPDATED_AT, workspaceSlug };
};

test("Application Skeleton completed marker is downgraded when materialization progress is unavailable", () => {
  const state = createState("demo");
  const updated = applyTechnicalRootProgressToState({
    applicationSkeletonProgress: null,
    qualityGatesProgress: null,
    state,
  });
  const blocked = resolveWorkflowBlockedStages({
    applicationSkeletonProgress: null,
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
});
