import { DiagramModulesManagedGitBoundary } from "../diagram-modules/diagram-modules-managed-git-boundary";
import { commitManagedWorkflowLedger } from "../diagram-modules/managed-workflow-ledger-git-boundary";
import { ensureManagedTerminalGitClean } from "../managed-terminal-clean-git-boundary";
import { cleanQualityGatesDraftScope } from "./quality-gates-draft-scope-cleaner";
import {
  addUnique,
  appendIntegrationStep,
  buildContractArtifactPaths,
  buildIntegrateTaskId,
  collectQualityGatePaths,
  collectRootQualityGatePaths,
  DRAFT_COMMIT_MESSAGE,
  DRAFT_TASK_ID,
  INTEGRATE_COMMIT_MESSAGE,
  type ManagedPlanState,
  type ManagedWorkspaceState,
  markReviewAcceptedWithoutRevision,
  type NextPlanStep,
  openDraftStagePlan,
  PHASE5_TASK_ID,
  PLAN_END,
  PLAN_START,
  parseStateBlock,
  QUALITY_GATES_STAGE_PLAN_PATH,
  REVIEW_TASK_PREFIX,
  readText,
  replaceStateBlock,
  resolveNextAfterCommit,
  resolveNextAfterRejectedCommit,
  uniqueExistingPaths,
  updateStagePlanAfterCommit,
  WORKSPACE_END,
  WORKSPACE_PLAN_PATH,
  WORKSPACE_START,
  writeText,
} from "./quality-gates-stage-plan-model";
import type { QualityGatesManagedValidationResult } from "./quality-gates-validator";

const DEVELOPMENT_TREE_BOOTSTRAP_COMMIT_MESSAGE =
  "docs: bootstrap product part development briefs";

export interface QualityGatesStagePlanCommit {
  readonly expectedCommitMessage: string;
  readonly hash: string;
  readonly nextTaskId: string | null;
}

export interface QualityGatesStagePlanBlocked {
  readonly message: string;
  readonly reason: "commit_failed" | "invalid_decision" | "plan_mismatch";
}

export type QualityGatesStagePlanAdvanceResult =
  | { readonly blocked: null; readonly commit: QualityGatesStagePlanCommit }
  | { readonly blocked: QualityGatesStagePlanBlocked; readonly commit: null };

export interface QualityGatesStagePlanControllerOptions {
  readonly gitBoundary?: ManagedGitBoundaryDependency;
}
interface ManagedGitBoundaryDependency {
  readonly commitManagedChanges: DiagramModulesManagedGitBoundary["commitManagedChanges"];
}

export class QualityGatesStagePlanController {
  private readonly gitBoundary: ManagedGitBoundaryDependency;

  constructor(options: QualityGatesStagePlanControllerOptions = {}) {
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
      QUALITY_GATES_STAGE_PLAN_PATH
    );
    const stageState = parseStateBlock<ManagedPlanState>(
      stagePlanText,
      PLAN_START,
      PLAN_END
    );
    const nextState: ManagedPlanState = {
      ...stageState,
      currentTaskId: DRAFT_TASK_ID,
      expectedCommitMessage: DRAFT_COMMIT_MESSAGE,
    };
    await writeText(
      params.workspaceRoot,
      QUALITY_GATES_STAGE_PLAN_PATH,
      replaceStateBlock(
        openDraftStagePlan(stagePlanText),
        PLAN_START,
        PLAN_END,
        nextState
      )
    );
    await this.updateWorkspaceState(params.workspaceRoot, null);
    await commitManagedWorkflowLedger({
      gitBoundary: this.managedGitBoundary,
      ledgerPaths: [WORKSPACE_PLAN_PATH, QUALITY_GATES_STAGE_PLAN_PATH],
      workspaceRoot: params.workspaceRoot,
    });
  }

  async acceptUserReviewWithoutRevision(params: {
    readonly workspaceRoot: string;
  }): Promise<string> {
    const stagePlanText = await readText(
      params.workspaceRoot,
      QUALITY_GATES_STAGE_PLAN_PATH
    );
    const stageState = parseStateBlock<ManagedPlanState>(
      stagePlanText,
      PLAN_START,
      PLAN_END
    );
    if (!stageState.currentTaskId?.startsWith(REVIEW_TASK_PREFIX)) {
      throw new Error("Quality Gates stage plan is not in review.");
    }
    const nextState: ManagedPlanState = {
      ...stageState,
      currentTaskId: buildIntegrateTaskId(1),
      expectedCommitMessage: INTEGRATE_COMMIT_MESSAGE,
    };
    const acceptedPlan = appendIntegrationStep(
      markReviewAcceptedWithoutRevision({
        content: stagePlanText,
        currentTaskId: stageState.currentTaskId,
        expectedCommitMessage: stageState.expectedCommitMessage ?? "",
      })
    );
    await writeText(
      params.workspaceRoot,
      QUALITY_GATES_STAGE_PLAN_PATH,
      replaceStateBlock(acceptedPlan, PLAN_START, PLAN_END, nextState)
    );
    await this.updateWorkspaceState(params.workspaceRoot, null);
    await commitManagedWorkflowLedger({
      gitBoundary: this.managedGitBoundary,
      ledgerPaths: [WORKSPACE_PLAN_PATH, QUALITY_GATES_STAGE_PLAN_PATH],
      workspaceRoot: params.workspaceRoot,
    });
    return INTEGRATE_COMMIT_MESSAGE;
  }

  commitManagedTurn(params: {
    readonly decision: QualityGatesManagedValidationResult;
    readonly sessionId: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<QualityGatesStagePlanAdvanceResult> {
    if (!params.decision.valid) {
      return Promise.resolve(this.blockInvalidDecision());
    }
    return this.commitCurrentTask({
      decision: params.decision,
      next: null,
      sessionId: params.sessionId,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
  }

  commitRejectedTurn(params: {
    readonly decision: QualityGatesManagedValidationResult;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<QualityGatesStagePlanAdvanceResult> {
    if (params.decision.valid) {
      return Promise.resolve(this.blockInvalidDecision());
    }
    return this.commitCurrentTask({
      decision: params.decision,
      next: null,
      sessionId: null,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
  }

  async commitTerminalHandoffResidue(params: {
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
    await ensureManagedTerminalGitClean({
      gitBoundary: this.managedGitBoundary,
      stage: "quality_gates",
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
  }

  async commitDevelopmentTreeBootstrap(params: {
    readonly managedPaths: readonly string[];
    readonly workspaceRoot: string;
  }): Promise<void> {
    await this.gitBoundary.commitManagedChanges({
      commitMessage: DEVELOPMENT_TREE_BOOTSTRAP_COMMIT_MESSAGE,
      managedPaths: params.managedPaths,
      workspaceRoot: params.workspaceRoot,
    });
  }

  async recordRejectedTurn(params: {
    readonly decision: QualityGatesManagedValidationResult;
    readonly rejectedCommitHash: string;
    readonly workspaceRoot: string;
  }): Promise<QualityGatesStagePlanAdvanceResult> {
    const stagePlanText = await readText(
      params.workspaceRoot,
      QUALITY_GATES_STAGE_PLAN_PATH
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
    await this.recordCommit({
      commitMessage: stageState.expectedCommitMessage,
      hash: params.rejectedCommitHash,
      next,
      sessionId: null,
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

  private async commitCurrentTask(params: {
    readonly decision: QualityGatesManagedValidationResult;
    readonly next: NextPlanStep | null;
    readonly sessionId: string | null;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<QualityGatesStagePlanAdvanceResult> {
    const stagePlanText = await readText(
      params.workspaceRoot,
      QUALITY_GATES_STAGE_PLAN_PATH
    );
    const stageState = parseStateBlock<ManagedPlanState>(
      stagePlanText,
      PLAN_START,
      PLAN_END
    );
    if (!(stageState.currentTaskId && stageState.expectedCommitMessage)) {
      return this.blockPlanMismatch();
    }
    if (params.decision.phase !== "integration") {
      await cleanQualityGatesDraftScope({
        workspaceRoot: params.workspaceRoot,
      });
    }
    const next =
      params.next ??
      (params.decision.valid
        ? resolveNextAfterCommit({
            currentTaskId: stageState.currentTaskId,
            decision: params.decision,
          })
        : resolveNextAfterRejectedCommit({
            content: stagePlanText,
            decision: params.decision,
          }));
    try {
      const gitCommit = await this.gitBoundary.commitManagedChanges({
        commitMessage: stageState.expectedCommitMessage,
        managedPaths: await this.collectManagedPaths(params),
        workspaceRoot: params.workspaceRoot,
      });
      if (gitCommit.noStagedChanges || !gitCommit.hash) {
        return this.blockCommitFailed(
          `No staged managed changes for commit "${stageState.expectedCommitMessage}".`
        );
      }
      await this.recordCommit({
        commitMessage: stageState.expectedCommitMessage,
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
          expectedCommitMessage: stageState.expectedCommitMessage,
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

  private async collectManagedPaths(params: {
    readonly decision: QualityGatesManagedValidationResult;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<readonly string[]> {
    const rootPaths =
      params.decision.phase === "integration"
        ? await collectRootQualityGatePaths(params.workspaceRoot)
        : [];
    return uniqueExistingPaths(params.workspaceRoot, [
      WORKSPACE_PLAN_PATH,
      QUALITY_GATES_STAGE_PLAN_PATH,
      ...buildContractArtifactPaths(params.workspaceSlug),
      `.codeai-hub/${params.workspaceSlug}/workflow/managed/quality_gates.json`,
      ...rootPaths,
      ...(params.decision.phase === "integration"
        ? collectQualityGatePaths(params.decision.contractJson)
        : []),
    ]);
  }

  private async recordCommit(params: {
    readonly commitMessage: string;
    readonly hash: string;
    readonly next: NextPlanStep;
    readonly sessionId: string | null;
    readonly stagePlanText: string;
    readonly stageState: ManagedPlanState;
    readonly workspaceRoot: string;
  }): Promise<void> {
    if (params.next.taskId === PHASE5_TASK_ID) {
      await ensureManagedTerminalGitClean({
        gitBoundary: this.managedGitBoundary,
        stage: "quality_gates",
        workspaceRoot: params.workspaceRoot,
      });
    }
    const nextStageState: ManagedPlanState = {
      ...params.stageState,
      currentTaskId: params.next.taskId,
      expectedCommitMessage: params.next.expectedCommitMessage,
      lastRecordedCommit: params.hash,
    };
    const nextPlanText = replaceStateBlock(
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
      QUALITY_GATES_STAGE_PLAN_PATH,
      nextPlanText
    );
    await this.updateWorkspaceState(
      params.workspaceRoot,
      params.sessionId
        ? {
            completed: params.next.taskId === PHASE5_TASK_ID,
            hash: params.hash,
            message: params.commitMessage,
            sessionId: params.sessionId,
            taskId: params.stageState.currentTaskId,
          }
        : null
    );
    await commitManagedWorkflowLedger({
      gitBoundary: this.managedGitBoundary,
      ledgerPaths: [WORKSPACE_PLAN_PATH, QUALITY_GATES_STAGE_PLAN_PATH],
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
      activePlanPath: QUALITY_GATES_STAGE_PLAN_PATH,
      activeStage: "quality_gates",
      unlockedStages: addUnique(workspaceState.unlockedStages, "quality_gates"),
    };
    if (acceptedCommit) {
      nextWorkspaceState.acceptedCommits = [
        ...acceptedCommits,
        {
          hash: acceptedCommit.hash,
          message: acceptedCommit.message,
          sessionId: acceptedCommit.sessionId,
          stage: "quality_gates",
          taskId: acceptedCommit.taskId,
        },
      ];
      nextWorkspaceState.lastAcceptedCommitHash = acceptedCommit.hash;
      nextWorkspaceState.lastAcceptedCommitMessage = acceptedCommit.message;
    }
    if (acceptedCommit?.completed) {
      nextWorkspaceState.completedStages = addUnique(
        workspaceState.completedStages,
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

  private blockInvalidDecision(): QualityGatesStagePlanAdvanceResult {
    return {
      blocked: {
        message:
          "Quality Gates validation did not accept the current managed artifact.",
        reason: "invalid_decision",
      },
      commit: null,
    };
  }

  private blockPlanMismatch(): QualityGatesStagePlanAdvanceResult {
    return {
      blocked: {
        message:
          "Quality Gates stage plan does not point to an active commit-backed microtask.",
        reason: "plan_mismatch",
      },
      commit: null,
    };
  }

  private blockCommitFailed(
    message: string
  ): QualityGatesStagePlanAdvanceResult {
    return { blocked: { message, reason: "commit_failed" }, commit: null };
  }
}
