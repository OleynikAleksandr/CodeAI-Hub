import { ManagedWorkflowStepRegistry } from "./managed-workflow-step-registry";

export interface ManagedWorkflowPreviewStageProjection {
  readonly controllerId: string;
  readonly displayName: string;
  readonly phaseTypes: readonly string[];
}

export interface ManagedWorkflowPreviewProjection {
  readonly active: true;
  readonly mode: "preview";
  readonly reason: string;
  readonly stages: readonly ManagedWorkflowPreviewStageProjection[];
}

export class ManagedWorkflowReadModelProjector {
  readonly #registry: ManagedWorkflowStepRegistry;

  constructor(options?: { readonly registry?: ManagedWorkflowStepRegistry }) {
    this.#registry = options?.registry ?? new ManagedWorkflowStepRegistry();
  }

  project(): ManagedWorkflowPreviewProjection {
    return {
      active: true,
      mode: "preview",
      reason:
        "Managed Workflow Orchestration cluster is active in preview mode; step-specific provider dispatch waits for follow-up releases.",
      stages: this.#registry.list().map((controller) => ({
        controllerId: controller.descriptor.stageId,
        displayName: controller.descriptor.displayName,
        phaseTypes: controller.descriptor.phaseTypes,
      })),
    };
  }
}
