import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import type { WorkflowAgentAcceptanceFeedbackGateway } from "./workflow-agent-acceptance-feedback";

const APPLICATION_SKELETON_STAGE = "application_skeleton";
const sentSignatures = new Set<string>();

const buildMaterializationContinuationPrompt = (): string =>
  [
    "Core accepted the Application Skeleton draft contract.",
    "Begin Phase 3 materialization in this same session per your Application Skeleton agent instructions.",
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

// The Phase 3 materialization continuation dispatch fires when the read-model
// snapshot observes `accepted: true` on `application-skeleton-map.json` —
// regardless of which path set it (Core accept-contract handler,
// PM Accept Contract button, typed-fallback recognizer, or the agent self-set
// per its Phase 2 prompt). `recentlyAcceptedSessions` is kept as an optional
// hint for the Core handler's own write path, no longer an exclusive gate.
// Premature `materialized: true` flips coming from the agent before acceptance
// are still caught by the premature-materialization validator earlier in the
// pipeline; this dispatcher only enables the prompt, never authorizes it.
const canContinueApplicationSkeleton = (
  progress: ApplicationSkeletonProgressSnapshot | null
): progress is ApplicationSkeletonProgressSnapshot =>
  progress !== null &&
  progress.accepted === true &&
  progress.acceptanceCommitted === true &&
  !progress.materialized &&
  progress.substep !== "artifact";

export const sendApplicationSkeletonContinuationIfReady = async (params: {
  readonly chains: readonly ContinuityChainSummary[];
  readonly gateway?: WorkflowAgentAcceptanceFeedbackGateway;
  readonly progress: ApplicationSkeletonProgressSnapshot | null;
  readonly recentlyAcceptedSessions?: ReadonlySet<string>;
}): Promise<void> => {
  if (!(params.gateway && canContinueApplicationSkeleton(params.progress))) {
    return;
  }
  const sessionId = resolveLatestStageSessionId(params.chains);
  if (!sessionId) {
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
