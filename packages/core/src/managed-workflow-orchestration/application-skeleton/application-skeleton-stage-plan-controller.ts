import { DiagramModulesManagedGitBoundary } from "../diagram-modules/diagram-modules-managed-git-boundary";
import { commitManagedWorkflowLedger } from "../diagram-modules/managed-workflow-ledger-git-boundary";
import { ensureManagedTerminalGitClean } from "../managed-terminal-clean-git-boundary";
import {
  APPLICATION_STAGE_PLAN_PATH,
  appendMaterializationStep,
  buildContractArtifactPaths,
  buildMaterializeTaskId,
  collectFoundationPaths,
  collectMaterializedPaths,
  DRAFT_COMMIT_MESSAGE,
  DRAFT_TASK_ID,
  MATERIALIZE_COMMIT_MESSAGE,
  type ManagedPlanState,
  markFinalReviewAccepted,
  markReviewAcceptedWithoutRevision,
  type NextPlanStep,
  openDraftStagePlan,
  PERSISTENT_RETURN_TASK_ID,
  PHASE4_TASK_ID,
  PLAN_END,
  PLAN_START,
  parseStateBlock,
  REVIEW_TASK_PREFIX,
  readText,
  replaceStateBlock,
  resolveNextAfterCommit,
  resolveNextAfterRejectedCommit,
  uniqueExistingPaths,
  updateApplicationSkeletonWorkspaceState,
  updateStagePlanAfterCommit,
  WORKSPACE_PLAN_PATH,
  writeText,
} from "./application-skeleton-stage-plan-model";
import type { ApplicationSkeletonManagedValidationResult } from "./application-skeleton-validator";

export interface ApplicationSkeletonStagePlanCommit {
  readonly expectedCommitMessage: string;
  readonly hash: string;
  readonly nextTaskId: string | null;
}
export interface ApplicationSkeletonStagePlanBlocked {
  readonly message: string;
  readonly reason: "commit_failed" | "invalid_decision" | "plan_mismatch";
}
export type ApplicationSkeletonStagePlanAdvanceResult =
  | {
      readonly blocked: null;
      readonly commit: ApplicationSkeletonStagePlanCommit;
    }
  | {
      readonly blocked: ApplicationSkeletonStagePlanBlocked;
      readonly commit: null;
    };
export interface ApplicationSkeletonStagePlanControllerOptions {
  readonly gitBoundary?: ManagedGitBoundaryDependency;
}
interface ManagedGitBoundaryDependency {
  readonly commitManagedChanges: DiagramModulesManagedGitBoundary["commitManagedChanges"];
}
const buildBlockedResult = (
  message: string,
  reason: ApplicationSkeletonStagePlanBlocked["reason"]
): ApplicationSkeletonStagePlanAdvanceResult => ({
  blocked: { message, reason },
  commit: null,
});

export class ApplicationSkeletonStagePlanController {
  private readonly gitBoundary: ManagedGitBoundaryDependency;

  constructor(options: ApplicationSkeletonStagePlanControllerOptions = {}) {
    this.gitBoundary =
      options.gitBoundary ?? new DiagramModulesManagedGitBoundary();
  }

  private get managedGitBoundary(): DiagramModulesManagedGitBoundary {
    return this.gitBoundary as DiagramModulesManagedGitBoundary;
  }

  async openDraftPhase(params: {
    readonly workspaceRoot: string;
  }): Promise<void> {
    const stagePlanText = await readText(
      params.workspaceRoot,
      APPLICATION_STAGE_PLAN_PATH
    );
    const stageState = parseStateBlock<ManagedPlanState>(
      stagePlanText,
      PLAN_START,
      PLAN_END
    );
    const nextStageState: ManagedPlanState = {
      ...stageState,
      currentTaskId: DRAFT_TASK_ID,
      expectedCommitMessage: DRAFT_COMMIT_MESSAGE,
    };
    const draftPlanText = openDraftStagePlan(stagePlanText);
    await writeText(
      params.workspaceRoot,
      APPLICATION_STAGE_PLAN_PATH,
      replaceStateBlock(draftPlanText, PLAN_START, PLAN_END, nextStageState)
    );
    await this.updateWorkspaceState(params.workspaceRoot, null);
    await commitManagedWorkflowLedger({
      gitBoundary: this.managedGitBoundary,
      ledgerPaths: [WORKSPACE_PLAN_PATH, APPLICATION_STAGE_PLAN_PATH],
      workspaceRoot: params.workspaceRoot,
    });
  }

  async acceptUserReviewWithoutRevision(params: {
    readonly workspaceRoot: string;
  }): Promise<string> {
    const stagePlanText = await readText(
      params.workspaceRoot,
      APPLICATION_STAGE_PLAN_PATH
    );
    const stageState = parseStateBlock<ManagedPlanState>(
      stagePlanText,
      PLAN_START,
      PLAN_END
    );
    if (!stageState.currentTaskId?.startsWith(REVIEW_TASK_PREFIX)) {
      throw new Error("Application Skeleton stage plan is not in review.");
    }
    const nextStageState: ManagedPlanState = {
      ...stageState,
      currentTaskId: buildMaterializeTaskId(1),
      expectedCommitMessage: MATERIALIZE_COMMIT_MESSAGE,
    };
    const acceptedPlan = appendMaterializationStep(
      markReviewAcceptedWithoutRevision({
        content: stagePlanText,
        currentTaskId: stageState.currentTaskId,
        expectedCommitMessage: stageState.expectedCommitMessage ?? "",
      })
    );
    await writeText(
      params.workspaceRoot,
      APPLICATION_STAGE_PLAN_PATH,
      replaceStateBlock(acceptedPlan, PLAN_START, PLAN_END, nextStageState)
    );
    await commitManagedWorkflowLedger({
      gitBoundary: this.managedGitBoundary,
      ledgerPaths: [WORKSPACE_PLAN_PATH, APPLICATION_STAGE_PLAN_PATH],
      workspaceRoot: params.workspaceRoot,
    });
    return MATERIALIZE_COMMIT_MESSAGE;
  }

  async acceptFinalMaterializedReview(params: {
    readonly workspaceRoot: string;
  }): Promise<void> {
    const stagePlanText = await readText(
      params.workspaceRoot,
      APPLICATION_STAGE_PLAN_PATH
    );
    const stageState = parseStateBlock<ManagedPlanState>(
      stagePlanText,
      PLAN_START,
      PLAN_END
    );
    if (stageState.currentTaskId !== PHASE4_TASK_ID) {
      throw new Error("Application Skeleton final review is not open.");
    }
    await ensureManagedTerminalGitClean({
      gitBoundary: this.managedGitBoundary,
      stage: "application_skeleton",
      workspaceRoot: params.workspaceRoot,
    });
    await writeText(
      params.workspaceRoot,
      APPLICATION_STAGE_PLAN_PATH,
      replaceStateBlock(
        markFinalReviewAccepted(stagePlanText),
        PLAN_START,
        PLAN_END,
        {
          ...stageState,
          currentTaskId: PERSISTENT_RETURN_TASK_ID,
          expectedCommitMessage: null,
        }
      )
    );
    await this.updateWorkspaceState(params.workspaceRoot, {
      completed: true,
      hash: stageState.lastRecordedCommit ?? "not-created-final-user-review",
      message: "not-created-final-user-review",
      sessionId: "core-final-review",
      taskId: PHASE4_TASK_ID,
    });
    await commitManagedWorkflowLedger({
      gitBoundary: this.managedGitBoundary,
      ledgerPaths: [WORKSPACE_PLAN_PATH, APPLICATION_STAGE_PLAN_PATH],
      workspaceRoot: params.workspaceRoot,
    });
  }

  async commitManagedTurn(params: {
    readonly decision: ApplicationSkeletonManagedValidationResult;
    readonly sessionId: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<ApplicationSkeletonStagePlanAdvanceResult> {
    if (!params.decision.valid) {
      return this.blockInvalidDecision();
    }
    const stagePlanText = await readText(
      params.workspaceRoot,
      APPLICATION_STAGE_PLAN_PATH
    );
    const stageState = parseStateBlock<ManagedPlanState>(
      stagePlanText,
      PLAN_START,
      PLAN_END
    );
    if (!(stageState.currentTaskId && stageState.expectedCommitMessage)) {
      return this.blockPlanMismatch();
    }
    const commitMessage = stageState.expectedCommitMessage;
    const next = resolveNextAfterCommit({
      currentTaskId: stageState.currentTaskId,
      decision: params.decision,
    });
    const managedPaths = await this.collectManagedPaths(params);

    try {
      const gitCommit = await this.gitBoundary.commitManagedChanges({
        commitMessage,
        managedPaths,
        workspaceRoot: params.workspaceRoot,
      });
      if (gitCommit.noStagedChanges || !gitCommit.hash) {
        return this.blockCommitFailed(
          `No staged managed changes for commit "${commitMessage}".`
        );
      }
      await this.recordCommit({
        commitMessage,
        hash: gitCommit.hash,
        next,
        sessionId: params.sessionId,
        stagePlanText,
        stageState,
        workspaceRoot: params.workspaceRoot,
      });
      return {
        blocked: null,
        commit: {
          expectedCommitMessage: commitMessage,
          hash: gitCommit.hash,
          nextTaskId: next.taskId,
        },
      };
    } catch (error) {
      return this.blockCommitFailed(
        error instanceof Error
          ? error.message
          : `Managed commit failed: ${String(error)}`
      );
    }
  }

  async commitRejectedTurn(params: {
    readonly decision: ApplicationSkeletonManagedValidationResult;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<ApplicationSkeletonStagePlanAdvanceResult> {
    if (params.decision.valid) {
      return this.blockInvalidDecision();
    }
    const stagePlanText = await readText(
      params.workspaceRoot,
      APPLICATION_STAGE_PLAN_PATH
    );
    const stageState = parseStateBlock<ManagedPlanState>(
      stagePlanText,
      PLAN_START,
      PLAN_END
    );
    if (!(stageState.currentTaskId && stageState.expectedCommitMessage)) {
      return this.blockPlanMismatch();
    }
    const managedPaths = await this.collectManagedPaths(params);
    try {
      const gitCommit = await this.gitBoundary.commitManagedChanges({
        commitMessage: stageState.expectedCommitMessage,
        managedPaths,
        workspaceRoot: params.workspaceRoot,
      });
      if (gitCommit.noStagedChanges || !gitCommit.hash) {
        return this.blockCommitFailed(
          `No staged managed changes for commit "${stageState.expectedCommitMessage}".`
        );
      }
      return await this.recordRejectedTurn({
        decision: params.decision,
        rejectedCommitHash: gitCommit.hash,
        workspaceRoot: params.workspaceRoot,
      });
    } catch (error) {
      return this.blockCommitFailed(
        error instanceof Error
          ? error.message
          : `Managed commit failed: ${String(error)}`
      );
    }
  }

  async recordRejectedTurn(params: {
    readonly decision: ApplicationSkeletonManagedValidationResult;
    readonly rejectedCommitHash: string;
    readonly workspaceRoot: string;
  }): Promise<ApplicationSkeletonStagePlanAdvanceResult> {
    const stagePlanText = await readText(
      params.workspaceRoot,
      APPLICATION_STAGE_PLAN_PATH
    );
    const stageState = parseStateBlock<ManagedPlanState>(
      stagePlanText,
      PLAN_START,
      PLAN_END
    );
    if (!(stageState.currentTaskId && stageState.expectedCommitMessage)) {
      return this.blockPlanMismatch();
    }
    const next = resolveNextAfterRejectedCommit({
      content: stagePlanText,
      decision: params.decision,
    });
    await this.recordRejectedCommit({
      commitMessage: stageState.expectedCommitMessage,
      hash: params.rejectedCommitHash,
      next,
      stagePlanText,
      stageState,
      workspaceRoot: params.workspaceRoot,
    });
    return {
      blocked: null,
      commit: {
        expectedCommitMessage: stageState.expectedCommitMessage,
        hash: params.rejectedCommitHash,
        nextTaskId: next.taskId,
      },
    };
  }

  private blockInvalidDecision(): ApplicationSkeletonStagePlanAdvanceResult {
    return buildBlockedResult(
      "Application Skeleton validation did not accept the current managed artifact.",
      "invalid_decision"
    );
  }

  private blockPlanMismatch(): ApplicationSkeletonStagePlanAdvanceResult {
    return buildBlockedResult(
      "Application Skeleton stage plan does not point to an active commit-backed microtask.",
      "plan_mismatch"
    );
  }

  private blockCommitFailed(
    message: string
  ): ApplicationSkeletonStagePlanAdvanceResult {
    return buildBlockedResult(message, "commit_failed");
  }

  private async collectManagedPaths(params: {
    readonly decision: ApplicationSkeletonManagedValidationResult;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<readonly string[]> {
    const foundationPaths =
      params.decision.phase === "materialization"
        ? await collectFoundationPaths(
            params.workspaceRoot,
            params.decision.mapJson
          )
        : [];
    return uniqueExistingPaths(params.workspaceRoot, [
      WORKSPACE_PLAN_PATH,
      APPLICATION_STAGE_PLAN_PATH,
      ...buildContractArtifactPaths(params.workspaceSlug),
      `.codeai-hub/${params.workspaceSlug}/workflow/managed/application_skeleton.json`,
      ...foundationPaths,
      ...(params.decision.phase === "materialization"
        ? collectMaterializedPaths(params.decision.mapJson)
        : []),
    ]);
  }

  private async recordCommit(params: {
    readonly commitMessage: string;
    readonly hash: string;
    readonly next: NextPlanStep;
    readonly sessionId: string;
    readonly stagePlanText: string;
    readonly stageState: ManagedPlanState;
    readonly workspaceRoot: string;
  }): Promise<void> {
    const nextStageState: ManagedPlanState = {
      ...params.stageState,
      currentTaskId: params.next.taskId,
      expectedCommitMessage: params.next.expectedCommitMessage,
      lastRecordedCommit: params.hash,
    };
    const nextStagePlanText = replaceStateBlock(
      updateStagePlanAfterCommit({
        content: params.stagePlanText,
        currentTaskId: params.stageState.currentTaskId ?? "",
        expectedCommitMessage: params.commitMessage,
        hash: params.hash,
        next: params.next,
      }),
      PLAN_START,
      PLAN_END,
      nextStageState
    );
    await writeText(
      params.workspaceRoot,
      APPLICATION_STAGE_PLAN_PATH,
      nextStagePlanText
    );
    await this.updateWorkspaceState(params.workspaceRoot, {
      completed: false,
      hash: params.hash,
      message: params.commitMessage,
      sessionId: params.sessionId,
      taskId: params.stageState.currentTaskId,
    });
    await commitManagedWorkflowLedger({
      gitBoundary: this.managedGitBoundary,
      ledgerPaths: [WORKSPACE_PLAN_PATH, APPLICATION_STAGE_PLAN_PATH],
      workspaceRoot: params.workspaceRoot,
    });
  }

  private async recordRejectedCommit(params: {
    readonly commitMessage: string;
    readonly hash: string;
    readonly next: NextPlanStep;
    readonly stagePlanText: string;
    readonly stageState: ManagedPlanState;
    readonly workspaceRoot: string;
  }): Promise<void> {
    const nextStageState: ManagedPlanState = {
      ...params.stageState,
      currentTaskId: params.next.taskId,
      expectedCommitMessage: params.next.expectedCommitMessage,
      lastRecordedCommit: params.hash,
    };
    const nextStagePlanText = replaceStateBlock(
      updateStagePlanAfterCommit({
        content: params.stagePlanText,
        currentTaskId: params.stageState.currentTaskId ?? "",
        expectedCommitMessage: params.commitMessage,
        hash: params.hash,
        next: params.next,
      }),
      PLAN_START,
      PLAN_END,
      nextStageState
    );
    await writeText(
      params.workspaceRoot,
      APPLICATION_STAGE_PLAN_PATH,
      nextStagePlanText
    );
    await this.updateWorkspaceState(params.workspaceRoot, null);
    await commitManagedWorkflowLedger({
      gitBoundary: this.managedGitBoundary,
      ledgerPaths: [WORKSPACE_PLAN_PATH, APPLICATION_STAGE_PLAN_PATH],
      workspaceRoot: params.workspaceRoot,
    });
  }

  private async updateWorkspaceState(
    workspaceRoot: string,
    acceptedCommit: {
      readonly completed: boolean;
      readonly hash: string;
      readonly message: string;
      readonly sessionId: string;
      readonly taskId: string | null;
    } | null
  ): Promise<void> {
    await updateApplicationSkeletonWorkspaceState(
      workspaceRoot,
      acceptedCommit
    );
  }
}
