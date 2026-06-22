import {
  parseDraftRepairTaskNumber,
  parseMaterializationRepairTaskNumber,
} from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-repair-model";
import { parseDiagramModulesRepairTaskNumber } from "../../managed-workflow-orchestration/diagram-modules/diagram-modules-stage-plan-repair-model";

export const resolveApplicationSkeletonDraftRepairAttemptNumber = (
  taskId: string | null
): number => parseDraftRepairTaskNumber(taskId ?? "") ?? 1;

export const resolveMaterializationRepairAttemptNumber = (
  taskId: string | null
): number => parseMaterializationRepairTaskNumber(taskId ?? "") ?? 1;

export const resolveDiagramModulesRepairAttemptNumber = (
  taskId: string | null
): number => parseDiagramModulesRepairTaskNumber(taskId ?? "") ?? 1;
