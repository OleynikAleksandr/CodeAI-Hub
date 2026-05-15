import type {
  ManagedWorkflowOrchestrationFacadeContract,
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

  previewStageStart(
    request: ManagedWorkflowStageStartRequest
  ): ManagedWorkflowStageStartDecision | null {
    const controller = this.#registry.get(request.stageId);
    if (!controller) {
      return null;
    }
    const stage = describeControllerStage(controller);
    if (stage.startPolicy === "provider_direct") {
      return null;
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
}
