import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import type { QualityGatesProgressSnapshot } from "./quality-gates-progress";
import type { WorkflowAgentAcceptanceFeedbackGateway } from "./workflow-agent-acceptance-feedback";

export const sendQualityGatesContinuationIfReady = (_params: {
  readonly chains: readonly ContinuityChainSummary[];
  readonly gateway?: WorkflowAgentAcceptanceFeedbackGateway;
  readonly progress: QualityGatesProgressSnapshot | null;
  readonly recentlyAcceptedSessions?: ReadonlySet<string>;
}): Promise<void> => Promise.resolve();
