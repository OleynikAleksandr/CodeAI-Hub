import type { ManagedWorkflowStageId } from "./managed-workflow-orchestration-contracts";
import type { ManagedWorkflowStepController } from "./managed-workflow-step-controller";
import { assertControllerStageMatch } from "./managed-workflow-step-controller";
import { applicationSkeletonStepController } from "./steps/application-skeleton-step-controller";
import { diagramModulesStepController } from "./steps/diagram-modules-step-controller";

const DEFAULT_MANAGED_WORKFLOW_CONTROLLERS: readonly ManagedWorkflowStepController[] =
  [diagramModulesStepController, applicationSkeletonStepController];

export class ManagedWorkflowStepRegistry {
  readonly #controllers = new Map<
    ManagedWorkflowStageId,
    ManagedWorkflowStepController
  >();

  constructor(
    controllers: readonly ManagedWorkflowStepController[] = DEFAULT_MANAGED_WORKFLOW_CONTROLLERS
  ) {
    for (const controller of controllers) {
      this.register(controller);
    }
  }

  get(stageId: string): ManagedWorkflowStepController | null {
    return this.#controllers.get(stageId as ManagedWorkflowStageId) ?? null;
  }

  has(stageId: string): stageId is ManagedWorkflowStageId {
    return this.#controllers.has(stageId as ManagedWorkflowStageId);
  }

  list(): readonly ManagedWorkflowStepController[] {
    return Array.from(this.#controllers.values());
  }

  register(controller: ManagedWorkflowStepController): void {
    const stageId = assertControllerStageMatch(controller);
    if (this.#controllers.has(stageId)) {
      throw new Error(
        `Managed workflow controller already registered: ${stageId}`
      );
    }
    this.#controllers.set(stageId, controller);
  }
}
