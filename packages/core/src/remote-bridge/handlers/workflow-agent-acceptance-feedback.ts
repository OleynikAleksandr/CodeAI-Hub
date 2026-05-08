import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import type { Logger } from "../../telemetry/logger";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import type { DiagramModulesProgressSnapshot } from "./diagram-modules-progress";
import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";

export interface WorkflowAgentAcceptanceFeedbackGateway {
  readonly handleMessage: (sessionId: string, content: string) => Promise<void>;
}

const QUALITY_GATES_STAGE = "quality_gates";
const APPLICATION_SKELETON_STAGE = "application_skeleton";
const DIAGRAM_MODULES_STAGE = "diagram_modules";

interface StageFeedbackRequest {
  readonly actionLines: readonly string[];
  readonly errors: readonly string[];
  readonly stage: string;
  readonly title: string;
}

const resolveLatestStageSessionId = (
  chains: readonly ContinuityChainSummary[],
  stage: string
): string | null => {
  let best: { readonly sessionId: string; readonly updatedAt: string } | null =
    null;
  for (const chain of chains) {
    if (chain.stage !== stage) {
      continue;
    }
    const sessionId = chain.segments.at(-1)?.sessionId;
    if (!sessionId) {
      continue;
    }
    if (!best || chain.updatedAt.localeCompare(best.updatedAt) > 0) {
      best = { sessionId, updatedAt: chain.updatedAt };
    }
  }
  return best?.sessionId ?? null;
};

const buildFeedbackMessage = (request: StageFeedbackRequest): string =>
  [
    `Core acceptance check failed for ${request.title}.`,
    "",
    "What needs to be fixed:",
    ...request.errors.map((error) => `- ${error}`),
    "",
    "Required action:",
    ...request.actionLines.map((action) => `- ${action}`),
  ].join("\n");

const createDiagramModulesErrors = (
  progress: DiagramModulesProgressSnapshot
): readonly string[] => {
  if (progress.substep === "blocked_ambiguity") {
    return [
      "Diagram Modules index is marked blocked_ambiguity and must be resolved before downstream stages can trust the module map.",
    ];
  }
  if (progress.aggregateReady) {
    return [];
  }
  if (progress.plannedCount === 0) {
    return ["Diagram Modules index does not declare any Product Part ids."];
  }
  const missingPart = progress.currentPartId ?? "unknown";
  return [
    `Diagram Modules is not complete: ${progress.generatedCount}/${progress.plannedCount} Product Part artifacts are valid; next missing or invalid Product Part is "${missingPart}".`,
  ];
};

export class WorkflowAgentAcceptanceFeedback {
  private readonly logger: Logger;
  private readonly sentSignatures = new Set<string>();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async sendManagedStageFeedback(params: {
    readonly chains: readonly ContinuityChainSummary[];
    readonly gateway?: WorkflowAgentAcceptanceFeedbackGateway;
    readonly request: StageFeedbackRequest | null;
    readonly workspaceSlug: string;
  }): Promise<void> {
    if (
      !(params.gateway && params.request) ||
      params.request.errors.length === 0
    ) {
      return;
    }
    const sessionId = resolveLatestStageSessionId(
      params.chains,
      params.request.stage
    );
    if (!sessionId) {
      this.logger.warn("Managed stage acceptance feedback has no session", {
        stage: params.request.stage,
        workspaceSlug: params.workspaceSlug,
      });
      return;
    }
    const signature = [
      params.workspaceSlug,
      params.request.stage,
      sessionId,
      ...params.request.errors,
    ].join("\0");
    if (this.sentSignatures.has(signature)) {
      return;
    }
    await params.gateway.handleMessage(
      sessionId,
      buildFeedbackMessage(params.request)
    );
    this.sentSignatures.add(signature);
  }

  async sendDiagramModulesFeedback(params: {
    readonly chains: readonly ContinuityChainSummary[];
    readonly gateway?: WorkflowAgentAcceptanceFeedbackGateway;
    readonly progress: DiagramModulesProgressSnapshot | null;
    readonly workspaceSlug: string;
  }): Promise<void> {
    const errors = params.progress
      ? createDiagramModulesErrors(params.progress)
      : [];
    await this.sendManagedStageFeedback({
      chains: params.chains,
      gateway: params.gateway,
      request:
        errors.length > 0
          ? {
              actionLines: [
                "Update the Diagram Modules artifacts until every planned Product Part has a valid product-parts/<part-id>.md file.",
                "Commit the repair with the current managed plan command so Core can re-run acceptance before the next workflow stage.",
              ],
              errors,
              stage: DIAGRAM_MODULES_STAGE,
              title: "Diagram Modules",
            }
          : null,
      workspaceSlug: params.workspaceSlug,
    });
  }

  async sendApplicationSkeletonFeedback(params: {
    readonly chains: readonly ContinuityChainSummary[];
    readonly gateway?: WorkflowAgentAcceptanceFeedbackGateway;
    readonly progress: ApplicationSkeletonProgressSnapshot | null;
    readonly workspaceSlug: string;
  }): Promise<void> {
    await this.sendManagedStageFeedback({
      chains: params.chains,
      gateway: params.gateway,
      request:
        params.progress?.substep === "failed" &&
        params.progress.validationErrors.length > 0
          ? {
              actionLines: [
                "Update application-skeleton-map.json and the materialized filesystem projection until every declared path exists and matches the accepted skeleton.",
                "Commit the repair with the current managed plan command so Core can re-run acceptance before Quality Gates starts.",
              ],
              errors: params.progress.validationErrors,
              stage: APPLICATION_SKELETON_STAGE,
              title: "Application Skeleton",
            }
          : null,
      workspaceSlug: params.workspaceSlug,
    });
  }

  async sendQualityGatesFeedback(params: {
    readonly chains: readonly ContinuityChainSummary[];
    readonly gateway?: WorkflowAgentAcceptanceFeedbackGateway;
    readonly progress: QualityGatesProgressSnapshot | null;
    readonly workspaceSlug: string;
  }): Promise<void> {
    await this.sendManagedStageFeedback({
      chains: params.chains,
      gateway: params.gateway,
      request:
        params.progress?.substep === "failed" &&
        params.progress.validationErrors.length > 0
          ? {
              actionLines: [
                "Update the Quality Gates integration so every selected required gate is wired into the managed lifecycle hooks.",
                "Re-run the affected qg:* checks and the aggregate quality gate command.",
                "Commit the repair with the current managed plan command so Core can re-run acceptance and unlock the next workflow step.",
              ],
              errors: params.progress.validationErrors,
              stage: QUALITY_GATES_STAGE,
              title: "Quality Gates Baseline",
            }
          : null,
      workspaceSlug: params.workspaceSlug,
    });
  }
}
