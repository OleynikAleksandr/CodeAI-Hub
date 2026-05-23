import type { WorkflowUndoStageId } from "../undo/workflow-step-undo-ledger";
import {
  type WorkflowStepCheckpoint,
  WorkflowStepCheckpointStore,
} from "./workflow-step-checkpoint-store";

export interface WorkflowStepCheckpointContract {
  readonly stage: WorkflowUndoStageId;
  readonly userSpaceRoot?: string;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface WorkflowStepCheckpointFacadeOptions {
  readonly clock?: () => string;
}

export class WorkflowStepCheckpointFacade {
  private readonly clock?: () => string;

  constructor(options: WorkflowStepCheckpointFacadeOptions = {}) {
    this.clock = options.clock;
  }

  async ensureCheckpoint(
    contract: WorkflowStepCheckpointContract
  ): Promise<WorkflowStepCheckpoint> {
    return await this.store(contract).ensure(contract.stage);
  }

  async restoreCheckpoint(
    contract: WorkflowStepCheckpointContract
  ): Promise<boolean> {
    return await this.store(contract).restore(contract.stage);
  }

  private store(
    contract: WorkflowStepCheckpointContract
  ): WorkflowStepCheckpointStore {
    return new WorkflowStepCheckpointStore({
      clock: this.clock,
      userSpaceRoot: contract.userSpaceRoot,
      workspaceRoot: contract.workspaceRoot,
      workspaceSlug: contract.workspaceSlug,
    });
  }
}
