import type {
  ManagedWorkflowOrchestrationFacadeContract,
  ManagedWorkflowStageDescriptor,
  ManagedWorkflowStageId,
  ManagedWorkflowStageStartDecision,
  ManagedWorkflowStageStartRequest,
} from "./managed-workflow-orchestration-contracts";
import { ManagedWorkflowStepRegistry } from "./managed-workflow-step-registry";

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
    return this.#registry.get(stageId)?.descriptor ?? null;
  }

  listRegisteredStages(): readonly ManagedWorkflowStageDescriptor[] {
    return this.#registry.list().map((controller) => controller.descriptor);
  }

  previewStageStart(
    request: ManagedWorkflowStageStartRequest
  ): ManagedWorkflowStageStartDecision | null {
    const controller = this.#registry.get(request.stageId);
    if (!controller) {
      return null;
    }
    const preview = controller.createPreviewBoundary(request);

    return {
      canDispatchProvider: false,
      code: preview.code,
      controllerId: controller.descriptor.stageId,
      message: [
        "Managed Workflow Orchestration cluster preview boundary.",
        preview.message,
      ].join("\n"),
      mode: "preview",
      stage: controller.descriptor,
    };
  }
}
