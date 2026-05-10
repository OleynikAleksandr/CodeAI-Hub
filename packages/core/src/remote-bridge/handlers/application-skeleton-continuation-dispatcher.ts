import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import type { WorkflowAgentAcceptanceFeedbackGateway } from "./workflow-agent-acceptance-feedback";

const APPLICATION_SKELETON_STAGE = "application_skeleton";
const sentSignatures = new Set<string>();

const buildMaterializationContinuationPrompt = (): string =>
  [
    "Core accepted the Application Skeleton draft contract.",
    "Begin Phase 2 materialization in this same session per your Application Skeleton agent instructions.",
    "Materialize the Product Part / Cluster / Module filesystem projection now and update both canonical artifacts to reflect the materialized state.",
    "When materialization is complete, report content readiness; Core owns the managed commit and plan advancement.",
  ].join("\n");

const resolveLatestStageSessionId = (
  chains: readonly ContinuityChainSummary[]
): string | null => {
  let best: { readonly sessionId: string; readonly updatedAt: string } | null =
    null;
  for (const chain of chains) {
    if (chain.stage !== APPLICATION_SKELETON_STAGE) {
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

const canContinueApplicationSkeleton = (
  progress: ApplicationSkeletonProgressSnapshot | null
): progress is ApplicationSkeletonProgressSnapshot =>
  progress !== null &&
  (progress.substep === "awaiting_acceptance" ||
    progress.substep === "accepted") &&
  !progress.materialized;

export const sendApplicationSkeletonContinuationIfReady = async (params: {
  readonly chains: readonly ContinuityChainSummary[];
  readonly gateway?: WorkflowAgentAcceptanceFeedbackGateway;
  readonly progress: ApplicationSkeletonProgressSnapshot | null;
  readonly recentlyAcceptedSessions: ReadonlySet<string>;
}): Promise<void> => {
  if (!(params.gateway && canContinueApplicationSkeleton(params.progress))) {
    return;
  }
  const sessionId = resolveLatestStageSessionId(params.chains);
  if (!(sessionId && params.recentlyAcceptedSessions.has(sessionId))) {
    return;
  }
  const signature = `${APPLICATION_SKELETON_STAGE}\0${sessionId}\0${params.progress.substep}`;
  if (sentSignatures.has(signature)) {
    return;
  }
  sentSignatures.add(signature);
  try {
    params.gateway.markFeedbackTurnStarted?.(sessionId);
    await params.gateway.handleMessage(
      sessionId,
      buildMaterializationContinuationPrompt()
    );
  } catch (error) {
    sentSignatures.delete(signature);
    throw error;
  }
};
