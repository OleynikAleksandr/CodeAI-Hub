import type {
  ManagedWorkflowOrchestrationFacadeContract,
  ManagedWorkflowPreviewBoundaryStartDecision,
  ManagedWorkflowStageDescriptor,
  ManagedWorkflowStageId,
  ManagedWorkflowStageStartDecision,
  ManagedWorkflowStageStartRequest,
} from "./managed-workflow-orchestration-contracts";
import { ManagedWorkflowStepRegistry } from "./managed-workflow-step-registry";

const DEFAULT_STAGE_START_POLICY = "core_preview_boundary";

const describeControllerStage = (controller: {
  readonly descriptor: ManagedWorkflowStageDescriptor;
}): ManagedWorkflowStageDescriptor => ({
  ...controller.descriptor,
  startPolicy: controller.descriptor.startPolicy ?? DEFAULT_STAGE_START_POLICY,
});

export class ManagedWorkflowOrchestrationFacade
  implements ManagedWorkflowOrchestrationFacadeContract
{
  readonly #registry: ManagedWorkflowStepRegistry;

  constructor(options?: { readonly registry?: ManagedWorkflowStepRegistry }) {
    this.#registry = options?.registry ?? new ManagedWorkflowStepRegistry();
  }

  canHandleStage(stageId: string): stageId is ManagedWorkflowStageId {
    return this.#registry.has(stageId);
  }

  describeStage(stageId: string): ManagedWorkflowStageDescriptor | null {
    const controller = this.#registry.get(stageId);
    return controller ? describeControllerStage(controller) : null;
  }

  listRegisteredStages(): readonly ManagedWorkflowStageDescriptor[] {
    return this.#registry.list().map(describeControllerStage);
  }

  resolveStageStart(
    request: ManagedWorkflowStageStartRequest
  ): ManagedWorkflowStageStartDecision | null {
    const controller = this.#registry.get(request.stageId);
    if (!controller) {
      return null;
    }
    const stage = describeControllerStage(controller);
    if (stage.startPolicy === "provider_direct") {
      return {
        canDispatchProvider: true,
        code: "managed_workflow_provider_direct",
        controllerId: stage.stageId,
        message: "",
        mode: "provider_direct",
        stage,
      };
    }
    if (stage.startPolicy === "managed_dispatch") {
      return {
        canDispatchProvider: true,
        code: "managed_workflow_managed_dispatch",
        controllerId: stage.stageId,
        message: [
          "Managed Workflow Orchestration cluster will dispatch this stage.",
          "Core owns the managed phase lifecycle for this step.",
        ].join("\n"),
        mode: "managed_dispatch",
        stage,
      };
    }
    const preview = controller.createPreviewBoundary(request);

    return {
      canDispatchProvider: false,
      code: preview.code,
      controllerId: stage.stageId,
      message: [
        "Managed Workflow Orchestration cluster preview boundary.",
        preview.message,
      ].join("\n"),
      mode: "preview",
      stage,
    };
  }

  previewStageStart(
    request: ManagedWorkflowStageStartRequest
  ): ManagedWorkflowPreviewBoundaryStartDecision | null {
    const decision = this.resolveStageStart(request);
    return decision?.code === "managed_workflow_preview_boundary"
      ? decision
      : null;
  }
}
