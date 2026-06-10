import type { DiagramModulesManagedGitBoundary } from "../diagram-modules/diagram-modules-managed-git-boundary";
import { createManagedLedgerGitBoundary } from "../diagram-modules/diagram-modules-review-acceptance";
import { commitManagedWorkflowLedger } from "../diagram-modules/managed-workflow-ledger-git-boundary";
import { ensureManagedTerminalGitClean } from "../managed-terminal-clean-git-boundary";
import {
  APPLICATION_STAGE_PLAN_PATH,
  type ManagedPlanState,
  type NextPlanStep,
  PLAN_END,
  PLAN_START,
  parseStateBlock,
  readText,
  replaceStateBlock,
  resolveNextAfterCommit,
  updateStagePlanAfterCommit,
  WORKSPACE_PLAN_PATH,
  writeText,
} from "./application-skeleton-stage-plan-model";
import {
  parseDraftRepairTaskNumber,
  parseMaterializationRepairTaskNumber,
} from "./application-skeleton-stage-plan-repair-model";
import type { ApplicationSkeletonManagedValidationResult } from "./application-skeleton-validator";

const REPAIR_LIMIT_DISPOSITION = "not-created-user-accepted-repair-limit-as-is";

export type ApplicationSkeletonRepairPhase = "draft" | "materialization";

export interface ApplicationSkeletonRepairLimitTask {
  readonly attemptNumber: number;
  readonly phase: ApplicationSkeletonRepairPhase;
}

const parseRepairLimitTask = (
  taskId: string
): ApplicationSkeletonRepairLimitTask | null => {
  const draftAttempt = parseDraftRepairTaskNumber(taskId);
  if (draftAttempt !== null) {
    return { attemptNumber: draftAttempt, phase: "draft" };
  }
  const materializationAttempt = parseMaterializationRepairTaskNumber(taskId);
  if (materializationAttempt !== null) {
    return { attemptNumber: materializationAttempt, phase: "materialization" };
  }
  return null;
};

export const readApplicationSkeletonRepairLimitTask = async (
  workspaceRoot: string
): Promise<ApplicationSkeletonRepairLimitTask | null> => {
  const planText = await readText(
    workspaceRoot,
    APPLICATION_STAGE_PLAN_PATH
  ).catch(() => null);
  if (!planText) {
    return null;
  }
  try {
    const state = parseStateBlock<ManagedPlanState>(
      planText,
      PLAN_START,
      PLAN_END
    );
    return state.currentTaskId
      ? parseRepairLimitTask(state.currentTaskId)
      : null;
  } catch {
    return null;
  }
};

const resolveNextAfterRepairLimitAccept = (
  currentTaskId: string
): NextPlanStep =>
  resolveNextAfterCommit({
    currentTaskId,
    decision: {
      nextAction: "open_persistent_return",
    } as ApplicationSkeletonManagedValidationResult,
  });

export const acceptApplicationSkeletonRepairLimitAsIs = async (params: {
  readonly gitBoundary?: Pick<
    DiagramModulesManagedGitBoundary,
    "commitManagedChanges"
  >;
  readonly workspaceRoot: string;
}): Promise<{
  readonly nextTaskId: string | null;
  readonly phase: ApplicationSkeletonRepairPhase;
}> => {
  const gitBoundary = (params.gitBoundary ??
    createManagedLedgerGitBoundary()) as DiagramModulesManagedGitBoundary;
  const planText = await readText(
    params.workspaceRoot,
    APPLICATION_STAGE_PLAN_PATH
  );
  const state = parseStateBlock<ManagedPlanState>(
    planText,
    PLAN_START,
    PLAN_END
  );
  const currentTaskId = state.currentTaskId;
  const repairTask = currentTaskId ? parseRepairLimitTask(currentTaskId) : null;
  if (!(currentTaskId && repairTask && state.expectedCommitMessage)) {
    throw new Error(
      "Application Skeleton stage plan is not on an open repair attempt."
    );
  }
  await ensureManagedTerminalGitClean({
    gitBoundary,
    stage: "application_skeleton",
    workspaceRoot: params.workspaceRoot,
  });
  const next = resolveNextAfterRepairLimitAccept(currentTaskId);
  const nextState: ManagedPlanState = {
    ...state,
    currentTaskId: next.taskId,
    expectedCommitMessage: next.expectedCommitMessage,
  };
  const nextPlanText = replaceStateBlock(
    updateStagePlanAfterCommit({
      content: planText,
      currentTaskId,
      expectedCommitMessage: state.expectedCommitMessage,
      hash: REPAIR_LIMIT_DISPOSITION,
      next,
    }),
    PLAN_START,
    PLAN_END,
    nextState
  );
  await writeText(
    params.workspaceRoot,
    APPLICATION_STAGE_PLAN_PATH,
    nextPlanText
  );
  await commitManagedWorkflowLedger({
    gitBoundary,
    ledgerPaths: [WORKSPACE_PLAN_PATH, APPLICATION_STAGE_PLAN_PATH],
    workspaceRoot: params.workspaceRoot,
  });
  return { nextTaskId: next.taskId, phase: repairTask.phase };
};

export const buildApplicationSkeletonRepairLimitRevisionPrompt = (params: {
  readonly userFeedback: string;
  readonly workspaceSlug: string;
}): string =>
  [
    "Core reopened the Application Skeleton repair after the user reviewed the repair-limit gate.",
    "Apply exactly the corrections the user requested below, then stop for Core validation.",
    "",
    "User corrections:",
    params.userFeedback,
    "",
    `Update the contract artifacts under \`.codeai-hub/${params.workspaceSlug}/application_skeleton/\` and the materialized workspace paths they declare.`,
    "Do not run Git commands or edit stage todo files.",
  ].join("\n");
