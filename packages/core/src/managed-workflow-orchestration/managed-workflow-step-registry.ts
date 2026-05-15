import type { ManagedWorkflowStageId } from "./managed-workflow-orchestration-contracts";
import type { ManagedWorkflowStepController } from "./managed-workflow-step-controller";
import { assertControllerStageMatch } from "./managed-workflow-step-controller";

export class ManagedWorkflowStepRegistry {
  readonly #controllers = new Map<
    ManagedWorkflowStageId,
    ManagedWorkflowStepController
  >();

  constructor(controllers: readonly ManagedWorkflowStepController[] = []) {
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
