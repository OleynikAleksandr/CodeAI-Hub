import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import type { WorkflowState } from "../../workflow/state/workflow-state-types";
import type { WorkflowStageId } from "../../workflow/watcher/watcher-types";

const isWorkflowStageId = (
  value: string | null | undefined
): value is WorkflowStageId =>
  value === "description" ||
  value === "virtual_simulation" ||
  value === "diagram_modules" ||
  value === "application_skeleton" ||
  value === "quality_gates";

export const hydrateWorkflowStateFromContinuity = (params: {
  readonly chains: readonly ContinuityChainSummary[];
  readonly state: WorkflowState;
}): WorkflowState => {
  let nextStages = params.state.stages;
  let updatedAt = params.state.updatedAt;

  for (const chain of params.chains) {
    const stage = isWorkflowStageId(chain.stage) ? chain.stage : null;
    if (
      !stage ||
      chain.segments.length === 0 ||
      params.state.stages[stage]?.status !== "idle"
    ) {
      continue;
    }
    nextStages = {
      ...nextStages,
      [stage]: {
        ...nextStages[stage],
        status: "in_progress",
        updatedAt: chain.updatedAt,
      },
    };
    if (chain.updatedAt.localeCompare(updatedAt) > 0) {
      updatedAt = chain.updatedAt;
    }
  }

  return nextStages === params.state.stages
    ? params.state
    : { ...params.state, stages: nextStages, updatedAt };
};
