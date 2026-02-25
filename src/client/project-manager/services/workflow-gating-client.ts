import type { WorkflowStageId } from "./workflow-state-client";

export type WorkflowGatingSnapshot = {
  readonly blocked: Record<WorkflowStageId, boolean>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const buildDefaultBlockedStages = (
  stageOrder: readonly WorkflowStageId[]
): Record<WorkflowStageId, boolean> =>
  stageOrder.reduce<Record<WorkflowStageId, boolean>>(
    (accumulator, stage) => {
      accumulator[stage] = false;
      return accumulator;
    },
    {} as Record<WorkflowStageId, boolean>
  );

export const parseWorkflowGating = (params: {
  readonly payload: unknown;
  readonly stageOrder: readonly WorkflowStageId[];
}): WorkflowGatingSnapshot => {
  const blocked = buildDefaultBlockedStages(params.stageOrder);
  if (!isRecord(params.payload)) {
    return { blocked };
  }
  const blockedPayload = params.payload.blocked;
  if (isRecord(blockedPayload)) {
    for (const stage of params.stageOrder) {
      const value = blockedPayload[stage];
      if (typeof value === "boolean") {
        blocked[stage] = value;
      }
    }
  }
  return { blocked };
};

