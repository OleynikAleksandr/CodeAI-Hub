import { parseDiagramModulesRepairTaskNumber } from "../../managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-repair-model";

const APPLICATION_SKELETON_MATERIALIZATION_REPAIR_TASK_RE =
  /^application-skeleton\.phase3\.repair\.task(\d+)$/u;

export const resolveMaterializationRepairAttemptNumber = (
  taskId: string | null
): number => {
  const match = taskId?.match(
    APPLICATION_SKELETON_MATERIALIZATION_REPAIR_TASK_RE
  );
  const value = Number(match?.[1]);
  return Number.isInteger(value) && value > 0 ? value : 1;
};

export const resolveDiagramModulesRepairAttemptNumber = (
  taskId: string | null
): number => parseDiagramModulesRepairTaskNumber(taskId ?? "") ?? 1;
