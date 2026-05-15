import type {
  ManagedWorkflowStageDescriptor,
  ManagedWorkflowStageId,
  ManagedWorkflowStageStartRequest,
} from "./managed-workflow-orchestration-contracts";
import type { ManagedWorkflowPhaseContract } from "./managed-workflow-phase-contracts";

export interface ManagedWorkflowStepPreviewBoundary {
  readonly code: "managed_workflow_preview_boundary";
  readonly message: string;
}

export interface ManagedWorkflowStepController {
  createPreviewBoundary(
    request: ManagedWorkflowStageStartRequest
  ): ManagedWorkflowStepPreviewBoundary;
  readonly descriptor: ManagedWorkflowStageDescriptor;
  readonly ownedPathGlobs: readonly string[];
  readonly phases: readonly ManagedWorkflowPhaseContract[];
}

export const assertControllerStageMatch = (
  controller: ManagedWorkflowStepController
): ManagedWorkflowStageId => controller.descriptor.stageId;
