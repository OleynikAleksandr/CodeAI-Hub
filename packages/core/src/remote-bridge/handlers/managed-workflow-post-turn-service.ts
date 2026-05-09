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

export class ManagedWorkflowPostTurnService {
  private readonly acceptanceFeedback: WorkflowAgentAcceptanceFeedback;
  private readonly developmentTreeAgentSessions?: DevelopmentTreeAgentSessionOptions;
  private readonly logger: Logger;
  private readonly transaction = new ManagedDocumentationCommitTransaction();
  private readonly sessionManager?: SessionManager;

  constructor(options: {
    readonly developmentTreeAgentSessions?: DevelopmentTreeAgentSessionOptions;
    readonly logger: Logger;
    readonly sessionManager?: SessionManager;
  }) {
    this.acceptanceFeedback = new WorkflowAgentAcceptanceFeedback(
      options.logger
    );
    this.developmentTreeAgentSessions = options.developmentTreeAgentSessions;
    this.logger = options.logger;
    this.sessionManager = options.sessionManager;
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
    const workspaceRoot = session.workspacePath;
    const workspaceSlug = session.initiativeSlug;
    this.run({ sessionId, workspaceRoot, workspaceSlug }).catch(
      (error: unknown) => {
        this.logger.warn("Managed workflow post-turn feedback failed", {
          sessionId,
          workspaceSlug,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    );
  }

  private async run(params: {
    readonly sessionId: string;
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
