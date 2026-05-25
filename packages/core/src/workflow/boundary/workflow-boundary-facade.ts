import path from "node:path";
import type { WorkflowStageId } from "../watcher/watcher-types";
import { WorkflowBoundaryGit } from "./workflow-boundary-git";
import {
  buildWorkflowBoundaryCommitMessage,
  buildWorkflowBoundaryRegistryCommitMessage,
  buildWorkflowClearCommitMessage,
  compareWorkflowBoundaryStages,
  isStageAtOrAfter,
  type WorkflowBoundaryEnsureResult,
  type WorkflowBoundaryRestoreResult,
} from "./workflow-boundary-model";
import { WorkflowBoundaryRegistryStore } from "./workflow-boundary-registry";
import { restoreWorkflowRuntimeSlices } from "./workflow-runtime-slice-snapshot";

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

const formatDirtyBoundaryError = (paths: readonly string[]): string =>
  [
    "Workflow boundary cannot be created because the workspace Git tree is dirty.",
    "A boundary is a pre-step rollback anchor, so Core must create it before any stage bootstrap or provider output is written.",
    "Commit, restore, or classify these paths before starting the workflow stage:",
    ...paths.map((value) => `- ${value}`),
  ].join("\n");

const isRecoverableDescriptionBootstrap = (params: {
  readonly dirtyPaths: readonly string[];
  readonly stage: WorkflowStageId;
}): boolean =>
  params.stage === "description" &&
  params.dirtyPaths.length === 1 &&
  params.dirtyPaths[0] === "?? .codeai-hub/";

export class WorkflowBoundaryFacade {
  private static readonly workspaceQueues = new Map<string, Promise<void>>();
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
    return await WorkflowBoundaryFacade.runExclusive(
      params.workspaceRoot,
      async () => await this.ensureBoundaryExclusive(params)
    );
  }

  private async ensureBoundaryExclusive(
    params: WorkflowBoundaryEnsureParams
  ): Promise<WorkflowBoundaryEnsureResult> {
    const registryPath = this.#registryStore.getRegistryPath(params);
    const existing = await this.#git.findBoundaryCommit(params);
    if (existing) {
      return {
        boundaryHash: existing.boundaryHash,
        created: false,
        registryPath,
        stage: params.stage,
      };
    }

    const dirtyPaths = await this.#git.statusPorcelain(params.workspaceRoot);
    if (
      dirtyPaths.length > 0 &&
      !isRecoverableDescriptionBootstrap({
        dirtyPaths,
        stage: params.stage,
      })
    ) {
      throw new Error(formatDirtyBoundaryError(dirtyPaths));
    }

    const commitMessage = buildWorkflowBoundaryCommitMessage(params.stage);
    const boundaryCommit = await this.#git.commit({
      allowEmpty: true,
      commitMessage,
      paths: dirtyPaths.length > 0 ? [".codeai-hub"] : undefined,
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
    const boundaries = await this.#git.readBoundaryCommits(
      params.workspaceRoot
    );
    const target = boundaries.find((entry) => entry.stage === params.stage);
    if (!target) {
      throw new Error(
        `Workflow boundary is missing for stage "${params.stage}".`
      );
    }

    const prunedStages = [
      ...new Set(
        boundaries
          .filter((entry) => isStageAtOrAfter(entry.stage, params.stage))
          .map((entry) => entry.stage)
      ),
    ].sort(compareWorkflowBoundaryStages);
    await this.#git.resetHard({
      hash: target.boundaryHash,
      workspaceRoot: params.workspaceRoot,
    });
    await this.#git.cleanPaths({
      paths: params.cleanPaths ?? DEFAULT_CLEAN_PATHS,
      workspaceRoot: params.workspaceRoot,
    });
    await restoreWorkflowRuntimeSlices({
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
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

  private static async runExclusive<T>(
    workspaceRoot: string,
    task: () => Promise<T>
  ): Promise<T> {
    const key = path.resolve(workspaceRoot);
    const previous =
      WorkflowBoundaryFacade.workspaceQueues.get(key) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const current = previous
      .catch(() => undefined)
      .then(
        () =>
          new Promise<void>((resolve) => {
            release = resolve;
          })
      );
    WorkflowBoundaryFacade.workspaceQueues.set(key, current);
    await previous.catch(() => undefined);
    try {
      return await task();
    } finally {
      release();
      if (WorkflowBoundaryFacade.workspaceQueues.get(key) === current) {
        WorkflowBoundaryFacade.workspaceQueues.delete(key);
      }
    }
  }
}
