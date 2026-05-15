import type {
  ManagedWorkflowOrchestrationFacadeContract,
  ManagedWorkflowStageDescriptor,
  ManagedWorkflowStageId,
  ManagedWorkflowStageStartDecision,
  ManagedWorkflowStageStartRequest,
} from "./managed-workflow-orchestration-contracts";

const MANAGED_STAGE_DESCRIPTORS: readonly ManagedWorkflowStageDescriptor[] = [
  {
    displayName: "Diagram Modules",
    phaseTypes: ["core_gated", "user_led_review", "persistent_user_return"],
    stageId: "diagram_modules",
  },
  {
    displayName: "Application Skeleton",
    phaseTypes: ["core_gated", "user_led_review", "persistent_user_return"],
    stageId: "application_skeleton",
  },
  {
    displayName: "Quality Gates Baseline",
    phaseTypes: ["core_gated", "user_led_review", "persistent_user_return"],
    stageId: "quality_gates",
  },
];

const descriptorsByStage = new Map(
  MANAGED_STAGE_DESCRIPTORS.map((descriptor) => [
    descriptor.stageId,
    descriptor,
  ])
);

const isManagedWorkflowStageId = (
  stageId: string
): stageId is ManagedWorkflowStageId =>
  descriptorsByStage.has(stageId as ManagedWorkflowStageId);

const buildPreviewBoundaryMessage = (
  request: ManagedWorkflowStageStartRequest,
  stage: ManagedWorkflowStageDescriptor
): string =>
  [
    `Core managed orchestration preview is active for ${stage.displayName}.`,
    "The new Managed Workflow Orchestration cluster owns this technical step boundary.",
    "Provider dispatch is intentionally disabled in this release slice; the next step-specific release will enable the controller implementation.",
    `Workspace: ${request.workspaceSlug}. Provider requested: ${request.providerId}.`,
  ].join("\n");

export class ManagedWorkflowOrchestrationFacade
  implements ManagedWorkflowOrchestrationFacadeContract
{
  canHandleStage(stageId: string): stageId is ManagedWorkflowStageId {
    return isManagedWorkflowStageId(stageId);
  }

  describeStage(stageId: string): ManagedWorkflowStageDescriptor | null {
    return this.canHandleStage(stageId)
      ? (descriptorsByStage.get(stageId) ?? null)
      : null;
  }

  listRegisteredStages(): readonly ManagedWorkflowStageDescriptor[] {
    return MANAGED_STAGE_DESCRIPTORS;
  }

  previewStageStart(
    request: ManagedWorkflowStageStartRequest
  ): ManagedWorkflowStageStartDecision | null {
    const stage = this.describeStage(request.stageId);
    if (!stage) {
      return null;
    }

    return {
      canDispatchProvider: false,
      code: "managed_workflow_preview_boundary",
      controllerId: stage.stageId,
      message: buildPreviewBoundaryMessage(request, stage),
      mode: "preview",
      stage,
    };
  }
}
