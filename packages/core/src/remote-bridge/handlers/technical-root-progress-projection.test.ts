import assert from "node:assert/strict";
import test from "node:test";
import type {
  WorkflowStageState,
  WorkflowState,
} from "../../workflow/state/workflow-state-types";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import {
  applyTechnicalRootProgressToState,
  type QualityGatesProgressSnapshot,
} from "./quality-gates-progress";

const WORKFLOW_STAGES = [
  "description",
  "virtual_simulation",
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
] as const satisfies readonly WorkflowStageId[];

const createStageState = (stage: WorkflowStageId): WorkflowStageState => ({
  artifacts: [],
  gates: [],
  stage,
  status: stage === "application_skeleton" ? "completed" : "idle",
  updatedAt: "2026-05-27T00:00:00.000Z",
});

const createState = (workspaceSlug: string): WorkflowState => {
  const stages = {} as WorkflowState["stages"];
  for (const stage of WORKFLOW_STAGES) {
    stages[stage] = createStageState(stage);
  }
  return {
    gates: [],
    stages,
    updatedAt: "2026-05-27T00:00:00.000Z",
    workspaceSlug,
  };
};

test("managed review artifacts override stale invalid stage markers", () => {
  const baseState = createState("demo");
  const state: WorkflowState = {
    ...baseState,
    stages: {
      ...baseState.stages,
      application_skeleton: {
        ...baseState.stages.application_skeleton,
        status: "invalid",
      },
      quality_gates: {
        ...baseState.stages.quality_gates,
        status: "invalid",
      },
    },
  };
  const applicationSkeletonProgress: ApplicationSkeletonProgressSnapshot = {
    accepted: false,
    foundationReady: false,
    mapExists: true,
    mappingReady: true,
    markdownExists: true,
    materializationState: "artifact",
    materialized: false,
    observedMaterialization: false,
    substep: "awaiting_acceptance",
    validationErrors: [],
  };
  const qualityGatesProgress: QualityGatesProgressSnapshot = {
    accepted: false,
    commandContractReady: true,
    integrated: false,
    integrationState: "not_started",
    jsonExists: true,
    markdownExists: true,
    substep: "awaiting_acceptance",
    validationErrors: [],
  };

  const updated = applyTechnicalRootProgressToState({
    applicationSkeletonProgress,
    qualityGatesProgress,
    state,
  });

  assert.equal(updated.stages.application_skeleton.status, "in_progress");
  assert.equal(updated.stages.quality_gates.status, "in_progress");
});
