import { readFile } from "node:fs/promises";
import path from "node:path";
import { readApplicationSkeletonRepairLimitTask } from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-repair-limit-acceptance";
import {
  PHASE4_TASK_ID as APPLICATION_FINAL_REVIEW_TASK_ID,
  PLAN_END as APPLICATION_PLAN_END,
  PLAN_START as APPLICATION_PLAN_START,
  REVIEW_TASK_PREFIX as APPLICATION_REVIEW_TASK_PREFIX,
  APPLICATION_STAGE_PLAN_PATH,
} from "../../managed-workflow-orchestration/application-skeleton/application-skeleton-stage-plan-model";
import {
  isDiagramModulesReviewOpen,
  readDiagramModulesRepairLimitAttempt,
} from "../../managed-workflow-orchestration/diagram-modules/diagram-modules-review-acceptance";
import { readQualityGatesRepairLimitTask } from "../../managed-workflow-orchestration/quality-gates/quality-gates-repair-limit-acceptance";
import {
  REVIEW_TASK_PREFIX as QUALITY_GATES_REVIEW_TASK_PREFIX,
  QUALITY_GATES_STAGE_PLAN_PATH,
  PLAN_END as QUALITY_PLAN_END,
  PLAN_START as QUALITY_PLAN_START,
} from "../../managed-workflow-orchestration/quality-gates/quality-gates-stage-plan-model";
import { isRepairAttemptLimitReached } from "./managed-repair-limit";

const FENCED_JSON_END_RE = /\s*```$/u;
const FENCED_JSON_START_RE = /^```json\s*/u;

export interface ManagedDocumentationReviewOpenStages {
  readonly applicationSkeleton: boolean;
  readonly diagramModules: boolean;
  readonly qualityGates: boolean;
}

const readCurrentTaskId = async (
  workspaceRoot: string,
  planPath: string,
  startMarker: string,
  endMarker: string
): Promise<string | null> => {
  const planText = await readFile(
    path.join(workspaceRoot, planPath),
    "utf8"
  ).catch(() => null);
  const json = planText
    ?.split(startMarker)[1]
    ?.split(endMarker)[0]
    ?.trim()
    .replace(FENCED_JSON_START_RE, "")
    .replace(FENCED_JSON_END_RE, "")
    .trim();
  if (!json) {
    return null;
  }
  try {
    const state = JSON.parse(json) as { readonly currentTaskId?: unknown };
    return typeof state.currentTaskId === "string" ? state.currentTaskId : null;
  } catch {
    return null;
  }
};

export const isQualityGatesReviewOpen = async (
  workspaceRoot: string
): Promise<boolean> =>
  (
    await readCurrentTaskId(
      workspaceRoot,
      QUALITY_GATES_STAGE_PLAN_PATH,
      QUALITY_PLAN_START,
      QUALITY_PLAN_END
    )
  )?.startsWith(QUALITY_GATES_REVIEW_TASK_PREFIX) === true;

export const readApplicationSkeletonTaskId = (
  workspaceRoot: string
): Promise<string | null> =>
  readCurrentTaskId(
    workspaceRoot,
    APPLICATION_STAGE_PLAN_PATH,
    APPLICATION_PLAN_START,
    APPLICATION_PLAN_END
  );

const isApplicationSkeletonReviewTask = (taskId: string | null): boolean =>
  taskId === APPLICATION_FINAL_REVIEW_TASK_ID ||
  taskId?.startsWith(APPLICATION_REVIEW_TASK_PREFIX) === true;

export const readManagedDocumentationReviewOpenStages = async (
  workspaceRoot: string
): Promise<ManagedDocumentationReviewOpenStages> => {
  const [
    applicationTaskId,
    applicationRepairTask,
    diagramModulesReviewOpen,
    diagramModulesRepairAttempt,
    qualityGatesReviewOpen,
    qualityGatesRepairTask,
  ] = await Promise.all([
    readApplicationSkeletonTaskId(workspaceRoot),
    readApplicationSkeletonRepairLimitTask(workspaceRoot),
    isDiagramModulesReviewOpen(workspaceRoot),
    readDiagramModulesRepairLimitAttempt(workspaceRoot),
    isQualityGatesReviewOpen(workspaceRoot),
    readQualityGatesRepairLimitTask(workspaceRoot),
  ]);

  return {
    applicationSkeleton:
      isApplicationSkeletonReviewTask(applicationTaskId) ||
      Boolean(
        applicationRepairTask &&
          isRepairAttemptLimitReached(applicationRepairTask.attemptNumber)
      ),
    diagramModules:
      diagramModulesReviewOpen ||
      Boolean(
        diagramModulesRepairAttempt &&
          isRepairAttemptLimitReached(diagramModulesRepairAttempt)
      ),
    qualityGates:
      qualityGatesReviewOpen ||
      Boolean(
        qualityGatesRepairTask &&
          isRepairAttemptLimitReached(qualityGatesRepairTask.attemptNumber)
      ),
  };
};
