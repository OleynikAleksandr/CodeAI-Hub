import path from "node:path";
import type { WorkflowStageId } from "../watcher/watcher-types";
import { WorkflowBoundaryGit } from "./workflow-boundary-git";
import {
  buildWorkflowBoundaryCommitMessage,
  buildWorkflowBoundaryRegistryCommitMessage,
  buildWorkflowClearCommitMessage,
  isStageAtOrAfter,
  type WorkflowBoundaryEnsureResult,
  type WorkflowBoundaryRestoreResult,
} from "./workflow-boundary-model";
import { WorkflowBoundaryRegistryStore } from "./workflow-boundary-registry";

export interface WorkflowBoundaryFacadeOptions {
  readonly clock?: () => string;
  readonly git?: WorkflowBoundaryGit;
  readonly registryStore?: WorkflowBoundaryRegistryStore;
}

export interface WorkflowBoundaryEnsureParams {
  readonly stage: WorkflowStageId;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface WorkflowBoundaryRestoreParams {
  readonly cleanPaths?: readonly string[];
  readonly stage: WorkflowStageId;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

const DEFAULT_CLEAN_PATHS = [
  ".codeai-hub",
  "doc/TODO/stages",
  "product-parts",
] as const;

export class WorkflowBoundaryFacade {
  readonly #clock: () => string;
  readonly #git: WorkflowBoundaryGit;
  readonly #registryStore: WorkflowBoundaryRegistryStore;

  constructor(options: WorkflowBoundaryFacadeOptions = {}) {
    this.#clock = options.clock ?? (() => new Date().toISOString());
    this.#git = options.git ?? new WorkflowBoundaryGit();
    this.#registryStore =
      options.registryStore ?? new WorkflowBoundaryRegistryStore();
  }

  async ensureBoundary(
    params: WorkflowBoundaryEnsureParams
  ): Promise<WorkflowBoundaryEnsureResult> {
    const registry = await this.#registryStore.read(params);
    const existing = registry.entries.find(
      (entry) => entry.stage === params.stage
    );
    const registryPath = this.#registryStore.getRegistryPath(params);
    if (existing) {
      await this.#git.ensureRepository(params.workspaceRoot);
      return {
        boundaryHash: existing.boundaryHash,
        created: false,
        registryPath,
        stage: params.stage,
      };
    }

    const commitMessage = buildWorkflowBoundaryCommitMessage(params.stage);
    const boundaryCommit = await this.#git.commit({
      allowEmpty: true,
      commitMessage,
      workspaceRoot: params.workspaceRoot,
    });
    await this.#registryStore.recordBoundary({
      boundaryHash: boundaryCommit.hash,
      commitMessage,
      createdAt: this.#clock(),
      stage: params.stage,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    await this.#git.commit({
      commitMessage: buildWorkflowBoundaryRegistryCommitMessage(params.stage),
      paths: [path.relative(params.workspaceRoot, registryPath)],
      workspaceRoot: params.workspaceRoot,
    });
    return {
      boundaryHash: boundaryCommit.hash,
      created: true,
      registryPath,
      stage: params.stage,
    };
  }

  async restoreBoundary(
    params: WorkflowBoundaryRestoreParams
  ): Promise<WorkflowBoundaryRestoreResult> {
    const registry = await this.#registryStore.read(params);
    const target = registry.entries.find(
      (entry) => entry.stage === params.stage
    );
    if (!target) {
      throw new Error(
        `Workflow boundary is missing for stage "${params.stage}".`
      );
    }

    const prunedStages = registry.entries
      .filter((entry) => isStageAtOrAfter(entry.stage, params.stage))
      .map((entry) => entry.stage);
    await this.#git.resetHard({
      hash: target.boundaryHash,
      workspaceRoot: params.workspaceRoot,
    });
    await this.#git.cleanPaths({
      paths: params.cleanPaths ?? DEFAULT_CLEAN_PATHS,
      workspaceRoot: params.workspaceRoot,
    });
    const prunedRegistry = await this.#registryStore.pruneFromStage(params);
    const registryPath = this.#registryStore.getRegistryPath(params);
    const clearCommit = await this.#git.commit({
      allowEmpty: true,
      commitMessage: buildWorkflowClearCommitMessage(params.stage),
      paths: [path.relative(params.workspaceRoot, registryPath)],
      workspaceRoot: params.workspaceRoot,
    });
    return {
      boundaryHash: target.boundaryHash,
      clearCommitHash: clearCommit.hash,
      prunedStages: prunedStages.filter((stage) =>
        prunedRegistry.entries.every((entry) => entry.stage !== stage)
      ),
      registryPath,
      stage: params.stage,
    };
  }
}
