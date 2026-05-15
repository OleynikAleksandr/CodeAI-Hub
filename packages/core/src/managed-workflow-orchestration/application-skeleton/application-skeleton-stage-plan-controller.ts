import { DiagramModulesManagedGitBoundary } from "../diagram-modules/diagram-modules-managed-git-boundary";
import {
  APPLICATION_STAGE_PLAN_PATH,
  addUnique,
  appendMaterializationStep,
  buildContractArtifactPaths,
  buildMaterializeTaskId,
  collectMaterializedPaths,
  collectRootConfigPaths,
  DRAFT_COMMIT_MESSAGE,
  DRAFT_TASK_ID,
  MATERIALIZE_COMMIT_MESSAGE,
  type ManagedPlanState,
  type ManagedWorkspaceState,
  markReviewAcceptedWithoutRevision,
  type NextPlanStep,
  PHASE4_TASK_ID,
  PLAN_END,
  PLAN_START,
  parseStateBlock,
  REVIEW_TASK_PREFIX,
  readText,
  replaceStateBlock,
  resolveNextAfterCommit,
  uniqueExistingPaths,
  updateStagePlanAfterCommit,
  WORKSPACE_END,
  WORKSPACE_PLAN_PATH,
  WORKSPACE_START,
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
  readonly gitBoundary?: DiagramModulesManagedGitBoundary;
}

export class ApplicationSkeletonStagePlanController {
  private readonly gitBoundary: DiagramModulesManagedGitBoundary;

  constructor(options: ApplicationSkeletonStagePlanControllerOptions = {}) {
    this.gitBoundary =
      options.gitBoundary ?? new DiagramModulesManagedGitBoundary();
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
    await writeText(
      params.workspaceRoot,
      APPLICATION_STAGE_PLAN_PATH,
      replaceStateBlock(stagePlanText, PLAN_START, PLAN_END, nextStageState)
    );
    await this.updateWorkspaceState(params.workspaceRoot, null);
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
    return MATERIALIZE_COMMIT_MESSAGE;
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

  private blockInvalidDecision(): ApplicationSkeletonStagePlanAdvanceResult {
    return {
      blocked: {
        message:
          "Application Skeleton validation did not accept the current managed artifact.",
        reason: "invalid_decision",
      },
      commit: null,
    };
  }

  private blockPlanMismatch(): ApplicationSkeletonStagePlanAdvanceResult {
    return {
      blocked: {
        message:
          "Application Skeleton stage plan does not point to an active commit-backed microtask.",
        reason: "plan_mismatch",
      },
      commit: null,
    };
  }

  private blockCommitFailed(
    message: string
  ): ApplicationSkeletonStagePlanAdvanceResult {
    return {
      blocked: { message, reason: "commit_failed" },
      commit: null,
    };
  }

  private async collectManagedPaths(params: {
    readonly decision: ApplicationSkeletonManagedValidationResult;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<readonly string[]> {
    const rootConfigPaths =
      params.decision.phase === "materialization"
        ? await collectRootConfigPaths(params.workspaceRoot)
        : [];
    return uniqueExistingPaths(params.workspaceRoot, [
      WORKSPACE_PLAN_PATH,
      APPLICATION_STAGE_PLAN_PATH,
      ...buildContractArtifactPaths(params.workspaceSlug),
      ...rootConfigPaths,
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
      completed: params.next.taskId === PHASE4_TASK_ID,
      hash: params.hash,
      message: params.commitMessage,
      sessionId: params.sessionId,
      taskId: params.stageState.currentTaskId,
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
    const workspacePlanText = await readText(
      workspaceRoot,
      WORKSPACE_PLAN_PATH
    );
    const workspaceState = parseStateBlock<ManagedWorkspaceState>(
      workspacePlanText,
      WORKSPACE_START,
      WORKSPACE_END
    );
    const acceptedCommits = Array.isArray(workspaceState.acceptedCommits)
      ? workspaceState.acceptedCommits
      : [];
    const nextWorkspaceState: ManagedWorkspaceState = {
      ...workspaceState,
      activePlanPath: APPLICATION_STAGE_PLAN_PATH,
      activeStage: acceptedCommit?.completed
        ? "quality_gates"
        : "application_skeleton",
      unlockedStages: addUnique(
        workspaceState.unlockedStages,
        "application_skeleton"
      ),
    };
    if (acceptedCommit) {
      nextWorkspaceState.acceptedCommits = [
        ...acceptedCommits,
        {
          hash: acceptedCommit.hash,
          message: acceptedCommit.message,
          sessionId: acceptedCommit.sessionId,
          stage: "application_skeleton",
          taskId: acceptedCommit.taskId,
        },
      ];
      nextWorkspaceState.lastAcceptedCommitHash = acceptedCommit.hash;
      nextWorkspaceState.lastAcceptedCommitMessage = acceptedCommit.message;
    }
    if (acceptedCommit?.completed) {
      nextWorkspaceState.completedStages = addUnique(
        workspaceState.completedStages,
        "application_skeleton"
      );
      nextWorkspaceState.unlockedStages = addUnique(
        nextWorkspaceState.unlockedStages,
        "quality_gates"
      );
    }
    await writeText(
      workspaceRoot,
      WORKSPACE_PLAN_PATH,
      replaceStateBlock(
        workspacePlanText,
        WORKSPACE_START,
        WORKSPACE_END,
        nextWorkspaceState
      )
    );
  }
}
