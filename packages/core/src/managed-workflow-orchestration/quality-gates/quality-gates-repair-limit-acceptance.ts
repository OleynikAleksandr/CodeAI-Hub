import type { DiagramModulesManagedGitBoundary } from "../diagram-modules/diagram-modules-managed-git-boundary";
import { commitManagedWorkflowLedger } from "../diagram-modules/managed-workflow-ledger-git-boundary";
import {
  buildReviewCommitMessage,
  buildReviewTaskId,
  DRAFT_REPAIR_TASK_PREFIX,
  FORMAL_VERIFY_COMMIT_MESSAGE,
  FORMAL_VERIFY_TASK_ID,
  INTEGRATION_REPAIR_TASK_PREFIX,
  type ManagedPlanState,
  type NextPlanStep,
  PHASE5_TASK_ID,
  PLAN_END,
  PLAN_START,
  parseStateBlock,
  QUALITY_GATES_STAGE_PLAN_PATH,
  readText,
  replaceStateBlock,
  updateStagePlanAfterCommit,
  VERIFICATION_REPAIR_TASK_PREFIX,
  WORKSPACE_PLAN_PATH,
  writeText,
} from "./quality-gates-stage-plan-model";

const ACCEPTED_AS_IS_DISPOSITION =
  "not-created-user-accepted-repair-limit-as-is";

export type QualityGatesRepairPhase = "draft" | "integration" | "verification";

export interface QualityGatesRepairLimitTask {
  readonly attemptNumber: number;
  readonly phase: QualityGatesRepairPhase;
}

export interface QualityGatesRepairLimitAcceptResult {
  readonly nextTaskId: string | null;
  readonly phase: QualityGatesRepairPhase;
}

const REPAIR_TASK_PREFIXES: readonly (readonly [
  QualityGatesRepairPhase,
  string,
])[] = [
  ["draft", DRAFT_REPAIR_TASK_PREFIX],
  ["integration", INTEGRATION_REPAIR_TASK_PREFIX],
  ["verification", VERIFICATION_REPAIR_TASK_PREFIX],
];

const parseRepairLimitTask = (
  taskId: string
): QualityGatesRepairLimitTask | null => {
  for (const [phase, prefix] of REPAIR_TASK_PREFIXES) {
    if (!taskId.startsWith(prefix)) {
      continue;
    }
    const attemptNumber = Number(taskId.slice(prefix.length));
    if (Number.isInteger(attemptNumber) && attemptNumber > 0) {
      return { attemptNumber, phase };
    }
  }
  return null;
};

export const readQualityGatesRepairLimitTask = async (
  workspaceRoot: string
): Promise<QualityGatesRepairLimitTask | null> => {
  const planText = await readText(
    workspaceRoot,
    QUALITY_GATES_STAGE_PLAN_PATH
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
  phase: QualityGatesRepairPhase
): NextPlanStep => {
  if (phase === "draft") {
    return {
      expectedCommitMessage: buildReviewCommitMessage(1),
      taskId: buildReviewTaskId(1),
    };
  }
  if (phase === "integration") {
    return {
      expectedCommitMessage: FORMAL_VERIFY_COMMIT_MESSAGE,
      taskId: FORMAL_VERIFY_TASK_ID,
    };
  }
  return { expectedCommitMessage: null, taskId: PHASE5_TASK_ID };
};

export const acceptQualityGatesRepairLimitAsIs = async (params: {
  readonly gitBoundary: Pick<
    DiagramModulesManagedGitBoundary,
    "commitManagedChanges"
  >;
  readonly workspaceRoot: string;
}): Promise<QualityGatesRepairLimitAcceptResult> => {
  const planText = await readText(
    params.workspaceRoot,
    QUALITY_GATES_STAGE_PLAN_PATH
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
      "Quality Gates stage plan is not on an open repair attempt."
    );
  }
  const next = resolveNextAfterRepairLimitAccept(repairTask.phase);
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
      hash: ACCEPTED_AS_IS_DISPOSITION,
      next,
    }),
    PLAN_START,
    PLAN_END,
    nextState
  );
  await writeText(
    params.workspaceRoot,
    QUALITY_GATES_STAGE_PLAN_PATH,
    nextPlanText
  );
  await commitManagedWorkflowLedger({
    gitBoundary: params.gitBoundary as DiagramModulesManagedGitBoundary,
    ledgerPaths: [WORKSPACE_PLAN_PATH, QUALITY_GATES_STAGE_PLAN_PATH],
    workspaceRoot: params.workspaceRoot,
  });
  return { nextTaskId: next.taskId, phase: repairTask.phase };
};

export const buildQualityGatesRepairLimitRevisionPrompt = (params: {
  readonly userFeedback: string;
  readonly workspaceSlug: string;
}): string =>
  [
    "Core reopened the Quality Gates repair after the user reviewed the repair-limit gate.",
    "Apply exactly the corrections the user requested below, then stop for Core validation.",
    "",
    "User corrections:",
    params.userFeedback,
    "",
    `Update the managed artifacts under \`.codeai-hub/${params.workspaceSlug}/quality_gates/\` and the integration surface they describe.`,
    "Do not run Git commands or edit stage todo files.",
  ].join("\n");
