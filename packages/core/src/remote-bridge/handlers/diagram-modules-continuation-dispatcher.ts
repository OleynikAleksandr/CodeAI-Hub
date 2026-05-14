import type { ContinuityChainSummary } from "../../session-continuity/continuity-types";
import type { DiagramModulesProgressSnapshot } from "./diagram-modules-progress";
import type { WorkflowAgentAcceptanceFeedbackGateway } from "./workflow-agent-acceptance-feedback";

export const sendDiagramModulesContinuationIfReady = (_params: {
  readonly chains: readonly ContinuityChainSummary[];
  readonly gateway?: WorkflowAgentAcceptanceFeedbackGateway;
  readonly progress: DiagramModulesProgressSnapshot | null;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<void> => Promise.resolve();
