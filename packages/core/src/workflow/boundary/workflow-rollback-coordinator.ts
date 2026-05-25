import path from "node:path";
import type { WorkflowStageId } from "../watcher/watcher-types";
import { WorkflowBoundaryGit } from "./workflow-boundary-git";
import {
  buildWorkflowClearCommitMessage,
  type WorkflowBoundaryGitLogEntry,
  type WorkflowBoundaryRestoreResult,
} from "./workflow-boundary-model";
import { WorkflowBoundaryRegistryStore } from "./workflow-boundary-registry";
import { restoreWorkflowRuntimeSlices } from "./workflow-runtime-slice-snapshot";

export interface WorkflowRollbackQuiesceParams {
  readonly boundaryHash: string;
  readonly stage: WorkflowStageId;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface WorkflowRollbackCoordinatorOptions {
  readonly git?: WorkflowBoundaryGit;
  readonly quiesce?: (params: WorkflowRollbackQuiesceParams) => Promise<void>;
  readonly registryStore?: WorkflowBoundaryRegistryStore;
}

export interface WorkflowRollbackCoordinatorParams {
  readonly prunedStages: readonly WorkflowStageId[];
  readonly stage: WorkflowStageId;
  readonly target: WorkflowBoundaryGitLogEntry;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

const formatDirtyRollbackError = (paths: readonly string[]): string =>
  [
    "Workflow rollback finished with a dirty Git tree.",
    "Clear must leave the workspace exactly on a committed Git state.",
    "Remaining paths:",
    ...paths.map((value) => `- ${value}`),
  ].join("\n");

const defaultQuiesce = async (): Promise<void> => undefined;

export class WorkflowRollbackCoordinator {
  readonly #git: WorkflowBoundaryGit;
  readonly #quiesce: (params: WorkflowRollbackQuiesceParams) => Promise<void>;
  readonly #registryStore: WorkflowBoundaryRegistryStore;

  constructor(options: WorkflowRollbackCoordinatorOptions = {}) {
    this.#git = options.git ?? new WorkflowBoundaryGit();
    this.#quiesce = options.quiesce ?? defaultQuiesce;
    this.#registryStore =
      options.registryStore ?? new WorkflowBoundaryRegistryStore();
  }

  async rollback(
    params: WorkflowRollbackCoordinatorParams
  ): Promise<WorkflowBoundaryRestoreResult> {
    await this.#quiesce({
      boundaryHash: params.target.boundaryHash,
      stage: params.stage,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    await this.#git.resetHard({
      hash: params.target.boundaryHash,
      workspaceRoot: params.workspaceRoot,
    });
    await this.#git.cleanWorktree({ workspaceRoot: params.workspaceRoot });
    await restoreWorkflowRuntimeSlices({
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    const projection = await this.rebuildProjection(params);
    const clearCommit = await this.#git.commit({
      allowEmpty: true,
      commitMessage: buildWorkflowClearCommitMessage(params.stage),
      paths: [path.relative(params.workspaceRoot, projection.registryPath)],
      workspaceRoot: params.workspaceRoot,
    });
    await this.assertCleanWorktree(params.workspaceRoot);
    return {
      boundaryHash: params.target.boundaryHash,
      clearCommitHash: clearCommit.hash,
      prunedStages: projection.prunedStages,
      registryPath: projection.registryPath,
      stage: params.stage,
    };
  }

  private async rebuildProjection(
    params: WorkflowRollbackCoordinatorParams
  ): Promise<{
    readonly prunedStages: readonly WorkflowStageId[];
    readonly registryPath: string;
  }> {
    const prunedRegistry = await this.#registryStore.pruneFromStage(params);
    const registryPath = this.#registryStore.getRegistryPath(params);
    return {
      prunedStages: params.prunedStages.filter((stage) =>
        prunedRegistry.entries.every((entry) => entry.stage !== stage)
      ),
      registryPath,
    };
  }

  private async assertCleanWorktree(workspaceRoot: string): Promise<void> {
    const dirtyPaths = await this.#git.statusPorcelain(workspaceRoot);
    if (dirtyPaths.length > 0) {
      throw new Error(formatDirtyRollbackError(dirtyPaths));
    }
  }
}
