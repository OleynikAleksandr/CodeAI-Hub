import type { ManagedWorkflowStageStartPolicy } from "./managed-workflow-orchestration-contracts";
import type {
  ManagedWorkflowPhaseSnapshot,
  ManagedWorkflowRunStatus,
  ManagedWorkflowSnapshot,
} from "./managed-workflow-snapshot";
import { ManagedWorkflowStepRegistry } from "./managed-workflow-step-registry";

export interface ManagedWorkflowPreviewStageProjection {
  readonly controllerId: string;
  readonly currentPhase?: ManagedWorkflowPhaseSnapshot | null;
  readonly displayName: string;
  readonly phaseTypes: readonly string[];
  readonly runStatus?: ManagedWorkflowRunStatus;
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
  readonly currentSnapshots?: readonly ManagedWorkflowSnapshot[];
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
    const snapshotsByStage = new Map(
      (options.currentSnapshots ?? []).map((snapshot) => [
        snapshot.stageId,
        snapshot,
      ])
    );
    return {
      active: true,
      mode: "preview",
      readOnlyStages: options.readOnlyStages ?? [],
      reason:
        "Managed Workflow Orchestration cluster is active in preview mode; step-specific provider dispatch waits for follow-up releases.",
      stages: this.#registry.list().map((controller) => {
        const snapshot = snapshotsByStage.get(controller.descriptor.stageId);
        return {
          controllerId: controller.descriptor.stageId,
          currentPhase: snapshot?.currentPhase ?? null,
          displayName: controller.descriptor.displayName,
          phaseTypes: controller.descriptor.phaseTypes,
          runStatus: snapshot?.status ?? "idle",
          startPolicy:
            controller.descriptor.startPolicy ?? DEFAULT_STAGE_START_POLICY,
        };
      }),
    };
  }
}
