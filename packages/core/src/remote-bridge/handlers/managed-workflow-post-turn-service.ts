import type { DevelopmentTreeAgentSessionGateway } from "../../development-tree/node-bootstrap/node-agent-session-bootstrapper";
import { SessionContinuityFacade } from "../../session-continuity/session-continuity-facade";
import type { SessionManager } from "../../session-manager";
import type { Logger } from "../../telemetry/logger";
import { readApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import { sendDiagramModulesContinuationIfReady } from "./diagram-modules-continuation-dispatcher";
import {
  readDiagramModulesProgressSnapshot,
  syncDiagramModulesSubturnState,
} from "./diagram-modules-progress";
import { ManagedDocumentationCommitTransaction } from "./managed-documentation-commit-transaction";
import {
  attachManagedGitStatus,
  attachValidationDirtyGate,
  readManagedGitStatus,
} from "./managed-git-stage-gate";
import { readQualityGatesProgressSnapshot } from "./quality-gates-progress";
import {
  WorkflowAgentAcceptanceFeedback,
  type WorkflowAgentAcceptanceFeedbackGateway,
} from "./workflow-agent-acceptance-feedback";
import { commitManagedDocumentationStageIfReady } from "./workflow-state-managed-documentation-commit";

export interface DevelopmentTreeAgentSessionOptions {
  readonly gateway: DevelopmentTreeAgentSessionGateway;
  readonly providerId: string;
  readonly technologyBase?: string;
}

const MANAGED_POST_TURN_STAGES = new Set([
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
]);

const DEFAULT_MANAGED_ARBITRATION_RETRY_LIMIT = 5;

export interface ManagedArbitrationRetryNotice {
  readonly attempts: number;
  readonly reason: string;
  readonly retryLimit: number;
  readonly sessionId: string;
  readonly stage: string;
  readonly workspaceSlug: string;
}

export class ManagedWorkflowPostTurnService {
  private readonly acceptanceFeedback: WorkflowAgentAcceptanceFeedback;
  private readonly developmentTreeAgentSessions?: DevelopmentTreeAgentSessionOptions;
  private readonly logger: Logger;
  private readonly transaction = new ManagedDocumentationCommitTransaction();
  private readonly sessionManager?: SessionManager;
  private readonly inFlight = new Map<string, Promise<void>>();
  private readonly retryCounters = new Map<
    string,
    { stage: string; count: number }
  >();
  private readonly retryLimit: number;
  private readonly retryLimitNotifier?: (
    notice: ManagedArbitrationRetryNotice
  ) => void;

  constructor(options: {
    readonly developmentTreeAgentSessions?: DevelopmentTreeAgentSessionOptions;
    readonly logger: Logger;
    readonly onRetryLimitReached?: (
      notice: ManagedArbitrationRetryNotice
    ) => void;
    readonly retryLimit?: number;
    readonly sessionManager?: SessionManager;
  }) {
    this.acceptanceFeedback = new WorkflowAgentAcceptanceFeedback(
      options.logger
    );
    this.developmentTreeAgentSessions = options.developmentTreeAgentSessions;
    this.logger = options.logger;
    this.sessionManager = options.sessionManager;
    this.retryLimit =
      options.retryLimit ?? DEFAULT_MANAGED_ARBITRATION_RETRY_LIMIT;
    this.retryLimitNotifier = options.onRetryLimitReached;
  }

  handle(sessionId: string): void {
    const session = this.sessionManager?.getSession(sessionId);
    if (
      !(
        session?.workspacePath &&
        session.initiativeSlug &&
        session.stage &&
        MANAGED_POST_TURN_STAGES.has(session.stage)
      )
    ) {
      return;
    }
    if (this.inFlight.has(sessionId)) {
      this.logger.debug(
        "Managed workflow post-turn arbitration already in flight; skipping concurrent invocation",
        { sessionId, workspaceSlug: session.initiativeSlug }
      );
      return;
    }
    const workspaceRoot = session.workspacePath;
    const workspaceSlug = session.initiativeSlug;
    const stage = session.stage;
    const task = this.run({ sessionId, stage, workspaceRoot, workspaceSlug })
      .catch((error: unknown) => {
        this.logger.warn("Managed workflow post-turn feedback failed", {
          sessionId,
          workspaceSlug,
          error: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => {
        this.inFlight.delete(sessionId);
      });
    this.inFlight.set(sessionId, task);
  }

  async whenIdle(sessionId: string): Promise<void> {
    while (this.inFlight.has(sessionId)) {
      const current = this.inFlight.get(sessionId);
      if (!current) {
        return;
      }
      await current.catch(() => undefined);
    }
  }

  private trackArbitrationAttempt(
    sessionId: string,
    stage: string,
    stageDirty: boolean
  ): { attempts: number; blocked: boolean } {
    if (!stageDirty) {
      this.retryCounters.delete(sessionId);
      return { attempts: 0, blocked: false };
    }
    const current = this.retryCounters.get(sessionId);
    const nextAttempts =
      current && current.stage === stage ? current.count + 1 : 1;
    this.retryCounters.set(sessionId, { stage, count: nextAttempts });
    return {
      attempts: nextAttempts,
      blocked: nextAttempts > this.retryLimit,
    };
  }

  private async run(params: {
    readonly sessionId: string;
    readonly stage: string;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
    const [
      chains,
      rawDiagramModulesProgress,
      rawApplicationSkeletonProgress,
      rawQualityGatesProgress,
      managedGitStatus,
    ] = await Promise.all([
      SessionContinuityFacade.readWorkspaceChains(params),
      readDiagramModulesProgressSnapshot(params),
      readApplicationSkeletonProgressSnapshot(params),
      readQualityGatesProgressSnapshot(params),
      readManagedGitStatus(params.workspaceRoot, params.workspaceSlug),
    ]);
    const {
      applicationSkeletonProgress: latestApplicationSkeletonProgress,
      diagramModulesProgress: latestDiagramModulesProgress,
      managedGitStatus: latestManagedGitStatus,
      qualityGatesProgress: latestQualityGatesProgress,
    } = await commitManagedDocumentationStageIfReady({
      context: {
        applicationSkeletonProgress: rawApplicationSkeletonProgress,
        diagramModulesProgress: rawDiagramModulesProgress,
        managedGitStatus,
        qualityGatesProgress: rawQualityGatesProgress,
      },
      logger: this.logger,
      transaction: this.transaction,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    const stageOwnedDirty =
      latestManagedGitStatus.dirtyByStage[
        params.stage as keyof typeof latestManagedGitStatus.dirtyByStage
      ] ?? [];
    const retryStatus = this.trackArbitrationAttempt(
      params.sessionId,
      params.stage,
      stageOwnedDirty.length > 0
    );
    if (retryStatus.blocked) {
      const notice: ManagedArbitrationRetryNotice = {
        attempts: retryStatus.attempts,
        reason: `Managed arbitration exceeded the per-stage retry limit of ${this.retryLimit} attempts without progress; pause issued for user-actionable resolution.`,
        retryLimit: this.retryLimit,
        sessionId: params.sessionId,
        stage: params.stage,
        workspaceSlug: params.workspaceSlug,
      };
      this.logger.warn(
        "Managed arbitration retry limit exceeded; pausing dispatch",
        notice
      );
      this.retryLimitNotifier?.(notice);
      return;
    }
    const diagramModulesProgress = attachManagedGitStatus(
      latestDiagramModulesProgress,
      latestManagedGitStatus.dirtyByStage.diagram_modules
    );
    const applicationSkeletonProgress = attachValidationDirtyGate(
      latestApplicationSkeletonProgress,
      "Application Skeleton",
      latestManagedGitStatus.dirtyByStage.application_skeleton
    );
    const qualityGatesProgress = attachValidationDirtyGate(
      latestQualityGatesProgress,
      "Quality Gates",
      latestManagedGitStatus.dirtyByStage.quality_gates
    );
    const gateway = this.developmentTreeAgentSessions?.gateway as
      | WorkflowAgentAcceptanceFeedbackGateway
      | undefined;
    await Promise.all([
      syncDiagramModulesSubturnState({
        progress: latestDiagramModulesProgress,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      }),
      this.acceptanceFeedback.sendDiagramModulesFeedback({
        chains,
        gateway,
        progress: diagramModulesProgress,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      }),
      sendDiagramModulesContinuationIfReady({
        chains,
        gateway,
        progress: diagramModulesProgress,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      }),
      this.acceptanceFeedback.sendApplicationSkeletonFeedback({
        chains,
        gateway,
        progress: applicationSkeletonProgress,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      }),
      this.acceptanceFeedback.sendQualityGatesFeedback({
        chains,
        gateway,
        progress: qualityGatesProgress,
        workspaceRoot: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      }),
    ]);
  }
}
