import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import type { Logger } from "../../telemetry/logger";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import type { DiagramModulesProgressSnapshot } from "./diagram-modules-progress";
import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";

const MANAGED_FEEDBACK_DISABLED_REASON =
  "Managed workflow provider feedback dispatch is disabled while the managed workflow orchestration cluster is being rewritten.";

export interface WorkflowAgentAcceptanceFeedbackGateway {
  readonly handleMessage: (
    sessionId: string,
    payload: string | WorkflowAgentAcceptanceFeedbackPayload
  ) => Promise<void>;
  readonly markFeedbackTurnStarted?: (sessionId: string) => void;
}

interface WorkflowAgentAcceptanceFeedbackPayload {
  readonly content: string;
}

export class WorkflowAgentAcceptanceFeedback {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  sendManagedStageFeedback(params: {
    readonly chains: readonly ContinuityChainSummary[];
    readonly gateway?: WorkflowAgentAcceptanceFeedbackGateway;
    readonly request: unknown;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
    this.logDisabled("managed_stage", params.workspaceSlug);
    return Promise.resolve();
  }

  sendDiagramModulesFeedback(params: {
    readonly chains: readonly ContinuityChainSummary[];
    readonly gateway?: WorkflowAgentAcceptanceFeedbackGateway;
    readonly progress: DiagramModulesProgressSnapshot | null;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
    this.logDisabled("diagram_modules", params.workspaceSlug);
    return Promise.resolve();
  }

  sendApplicationSkeletonFeedback(params: {
    readonly chains: readonly ContinuityChainSummary[];
    readonly gateway?: WorkflowAgentAcceptanceFeedbackGateway;
    readonly progress: ApplicationSkeletonProgressSnapshot | null;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
    this.logDisabled("application_skeleton", params.workspaceSlug);
    return Promise.resolve();
  }

  sendQualityGatesFeedback(params: {
    readonly chains: readonly ContinuityChainSummary[];
    readonly gateway?: WorkflowAgentAcceptanceFeedbackGateway;
    readonly progress: QualityGatesProgressSnapshot | null;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<void> {
    this.logDisabled("quality_gates", params.workspaceSlug);
    return Promise.resolve();
  }

  private logDisabled(stage: string, workspaceSlug: string): void {
    this.logger.warn(MANAGED_FEEDBACK_DISABLED_REASON, {
      stage,
      workspaceSlug,
    });
  }
}
