import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";
import type { WorkflowAgentAcceptanceFeedbackGateway } from "./workflow-agent-acceptance-feedback";

const QUALITY_GATES_STAGE = "quality_gates";
const sentSignatures = new Set<string>();

const buildIntegrationContinuationPrompt = (): string =>
  [
    "Core accepted and committed the Quality Gates draft contract.",
    "Begin Phase 3 integration in this same session per your Quality Gates agent instructions.",
    "Wire only the accepted gates into the materialized Application Skeleton (package manifests, lockfile, gate scripts, tool configs) and update both Quality Gates artifacts to record actual integration evidence.",
    "Do not edit `.husky/**` directly; Core owns hook regeneration. Stop with content readiness when integration is complete and Core will own the managed commit and plan advancement.",
  ].join("\n");

const resolveLatestStageSessionId = (
  chains: readonly ContinuityChainSummary[]
): string | null => {
  let best: { readonly sessionId: string; readonly updatedAt: string } | null =
    null;
  for (const chain of chains) {
    if (chain.stage !== QUALITY_GATES_STAGE) {
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

const canContinueQualityGates = (
  progress: QualityGatesProgressSnapshot | null
): progress is QualityGatesProgressSnapshot =>
  progress !== null &&
  progress.accepted === true &&
  progress.acceptanceCommitted === true &&
  !progress.integrated &&
  progress.substep !== "artifact" &&
  progress.substep !== "awaiting_acceptance";

export const sendQualityGatesContinuationIfReady = async (params: {
  readonly chains: readonly ContinuityChainSummary[];
  readonly gateway?: WorkflowAgentAcceptanceFeedbackGateway;
  readonly progress: QualityGatesProgressSnapshot | null;
  readonly recentlyAcceptedSessions?: ReadonlySet<string>;
}): Promise<void> => {
  if (!(params.gateway && canContinueQualityGates(params.progress))) {
    return;
  }
  const sessionId = resolveLatestStageSessionId(params.chains);
  if (!sessionId) {
    return;
  }
  const signature = `${QUALITY_GATES_STAGE}\0${sessionId}\0${params.progress.substep}`;
  if (sentSignatures.has(signature)) {
    return;
  }
  sentSignatures.add(signature);
  try {
    params.gateway.markFeedbackTurnStarted?.(sessionId);
    await params.gateway.handleMessage(
      sessionId,
      buildIntegrationContinuationPrompt()
    );
  } catch (error) {
    sentSignatures.delete(signature);
    throw error;
  }
};
