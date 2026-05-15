import type { ManagedWorkflowCoreMessage } from "./managed-workflow-core-message";
import type { ManagedWorkflowStageStartDecision } from "./managed-workflow-orchestration-contracts";

export class ManagedWorkflowProviderGateway {
  buildPreviewBoundaryMessage(options: {
    readonly decision: ManagedWorkflowStageStartDecision;
    readonly timestamp: string;
  }): ManagedWorkflowCoreMessage {
    return {
      content: options.decision.message,
      role: "system",
      stageId: options.decision.controllerId,
      tag: "managed-workflow-preview",
      timestamp: options.timestamp,
      visibleToProvider: false,
      visibleToUser: true,
    };
  }
}
