import type { ManagedWorkflowStageId } from "./managed-workflow-orchestration-contracts";

export interface ManagedWorkflowCoreMessage {
  readonly content: string;
  readonly role: "system";
  readonly stageId: ManagedWorkflowStageId;
  readonly tag: "managed-workflow-preview";
  readonly timestamp: string;
  readonly visibleToProvider: boolean;
  readonly visibleToUser: boolean;
}
