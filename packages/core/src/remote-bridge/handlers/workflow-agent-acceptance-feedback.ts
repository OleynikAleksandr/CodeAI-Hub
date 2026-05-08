import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import type { Logger } from "../../telemetry/logger";
import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";

export interface WorkflowAgentAcceptanceFeedbackGateway {
  readonly handleMessage: (sessionId: string, content: string) => Promise<void>;
}

const QUALITY_GATES_STAGE = "quality_gates";

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

const buildQualityGatesFeedbackMessage = (
  progress: QualityGatesProgressSnapshot
): string =>
  [
    "Core acceptance check failed for Quality Gates Baseline.",
    "",
    "What needs to be fixed:",
    ...progress.validationErrors.map((error) => `- ${error}`),
    "",
    "Required action:",
    "- Update the Quality Gates integration so every selected required gate is wired into the managed lifecycle hooks.",
    "- Re-run the affected qg:* checks and the aggregate quality gate command.",
    "- Commit the repair with the current managed plan command so Core can re-run acceptance and unlock the next workflow step.",
  ].join("\n");

export class WorkflowAgentAcceptanceFeedback {
  private readonly logger: Logger;
  private readonly sentSignatures = new Set<string>();

  constructor(logger: Logger) {
    this.logger = logger;
  }

  async sendQualityGatesFeedback(params: {
    readonly chains: readonly ContinuityChainSummary[];
    readonly gateway?: WorkflowAgentAcceptanceFeedbackGateway;
    readonly progress: QualityGatesProgressSnapshot | null;
    readonly workspaceSlug: string;
  }): Promise<void> {
    if (
      !params.gateway ||
      params.progress?.substep !== "failed" ||
      params.progress.validationErrors.length === 0
    ) {
      return;
    }
    const sessionId = resolveLatestStageSessionId(
      params.chains,
      QUALITY_GATES_STAGE
    );
    if (!sessionId) {
      this.logger.warn("Quality Gates acceptance feedback has no session", {
        workspaceSlug: params.workspaceSlug,
      });
      return;
    }
    const signature = [
      params.workspaceSlug,
      QUALITY_GATES_STAGE,
      sessionId,
      ...params.progress.validationErrors,
    ].join("\0");
    if (this.sentSignatures.has(signature)) {
      return;
    }
    await params.gateway.handleMessage(
      sessionId,
      buildQualityGatesFeedbackMessage(params.progress)
    );
    this.sentSignatures.add(signature);
  }
}
