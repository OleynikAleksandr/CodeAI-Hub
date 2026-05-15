import type { ManagedWorkflowStageStartPolicy } from "./managed-workflow-orchestration-contracts";
import { ManagedWorkflowStepRegistry } from "./managed-workflow-step-registry";

export interface ManagedWorkflowPreviewStageProjection {
  readonly controllerId: string;
  readonly displayName: string;
  readonly phaseTypes: readonly string[];
  readonly startPolicy: ManagedWorkflowStageStartPolicy;
}

export interface ManagedWorkflowPreviewProjection {
  readonly active: true;
  readonly mode: "preview";
  readonly readOnlyStages: readonly string[];
  readonly reason: string;
  readonly stages: readonly ManagedWorkflowPreviewStageProjection[];
}

export interface ManagedWorkflowReadModelProjectOptions {
  readonly readOnlyStages?: readonly string[];
}

const DEFAULT_STAGE_START_POLICY = "core_preview_boundary";

export class ManagedWorkflowReadModelProjector {
  readonly #registry: ManagedWorkflowStepRegistry;

  constructor(options?: { readonly registry?: ManagedWorkflowStepRegistry }) {
    this.#registry = options?.registry ?? new ManagedWorkflowStepRegistry();
  }

  project(
    options: ManagedWorkflowReadModelProjectOptions = {}
  ): ManagedWorkflowPreviewProjection {
    return {
      active: true,
      mode: "preview",
      readOnlyStages: options.readOnlyStages ?? [],
      reason:
        "Managed Workflow Orchestration cluster is active in preview mode; step-specific provider dispatch waits for follow-up releases.",
      stages: this.#registry.list().map((controller) => ({
        controllerId: controller.descriptor.stageId,
        displayName: controller.descriptor.displayName,
        phaseTypes: controller.descriptor.phaseTypes,
        startPolicy:
          controller.descriptor.startPolicy ?? DEFAULT_STAGE_START_POLICY,
      })),
    };
  }
}
