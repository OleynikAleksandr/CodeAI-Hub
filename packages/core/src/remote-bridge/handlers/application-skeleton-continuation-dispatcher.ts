import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import type { ApplicationSkeletonProgressSnapshot } from "./application-skeleton-progress";
import type { WorkflowAgentAcceptanceFeedbackGateway } from "./workflow-agent-acceptance-feedback";

export const sendApplicationSkeletonContinuationIfReady = (_params: {
  readonly chains: readonly ContinuityChainSummary[];
  readonly gateway?: WorkflowAgentAcceptanceFeedbackGateway;
  readonly progress: ApplicationSkeletonProgressSnapshot | null;
  readonly recentlyAcceptedSessions?: ReadonlySet<string>;
}): Promise<void> => Promise.resolve();
