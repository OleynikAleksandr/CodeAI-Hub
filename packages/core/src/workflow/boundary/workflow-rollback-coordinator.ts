import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import {
  resolveWorkspaceRuntimeCapsule,
  type WorkspaceRuntimeCapsule,
} from "../runtime/workspace-runtime-capsule";
import { WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT } from "../runtime/workspace-runtime-capsule-gitignore";
import {
  isWorkspaceRollbackIgnoredRuntimePath,
  readWorkspaceSettingsRollbackSnapshot,
  restoreWorkspaceSettingsRollbackSnapshot,
  untrackWorkspaceRollbackIgnoredRuntimePaths,
  untrackWorkspaceSettingsForRollback,
} from "../runtime/workspace-settings-rollback-ignore";
import type { WorkflowStageId } from "../watcher/watcher-types";
import { WorkflowBoundaryGit } from "./workflow-boundary-git";
import {
  buildWorkflowClearCommitMessage,
  type WorkflowBoundaryGitLogEntry,
  type WorkflowBoundaryRestoreResult,
} from "./workflow-boundary-model";
import { WorkflowBoundaryRegistryStore } from "./workflow-boundary-registry";

const execFileAsync = promisify(execFile);

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

const writeCurrentRuntimeGitignore = async (params: {
  readonly absolutePath: string;
}): Promise<void> => {
  await mkdir(path.dirname(params.absolutePath), { recursive: true });
  await writeFile(
    params.absolutePath,
    WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT,
    "utf8"
  );
};

type RollbackIgnoredRuntimeSnapshot = readonly {
  readonly content: Buffer | null;
  readonly relativePath: string;
}[];

const isMissingFileError = (error: unknown): boolean =>
  (error as { readonly code?: unknown }).code === "ENOENT";

const readTrackedCapsulePaths = async (params: {
  readonly capsule: WorkspaceRuntimeCapsule;
  readonly workspaceRoot: string;
}): Promise<readonly string[]> => {
  const { stdout } = await execFileAsync(
    "git",
    ["ls-files", "-z", "--", params.capsule.workspaceCapsuleRoot.relativePath],
    { cwd: params.workspaceRoot }
  ).catch(() => ({ stdout: "" }));
  return stdout.split("\0").filter((value) => value.length > 0);
};

const readRollbackIgnoredRuntimeSnapshot = async (params: {
  readonly capsule: WorkspaceRuntimeCapsule;
  readonly workspaceRoot: string;
}): Promise<RollbackIgnoredRuntimeSnapshot> => {
  const entries: RollbackIgnoredRuntimeSnapshot[number][] = [];
  for (const relativePath of await readTrackedCapsulePaths(params)) {
    if (
      !isWorkspaceRollbackIgnoredRuntimePath({
        capsule: params.capsule,
        relativePath,
      })
    ) {
      continue;
    }
    try {
      entries.push({
        content: await readFile(path.join(params.workspaceRoot, relativePath)),
        relativePath,
      });
    } catch (error) {
      if (!isMissingFileError(error)) {
        throw error;
      }
      entries.push({ content: null, relativePath });
    }
  }
  return entries;
};

const restoreRollbackIgnoredRuntimeSnapshot = async (params: {
  readonly snapshot: RollbackIgnoredRuntimeSnapshot;
  readonly workspaceRoot: string;
}): Promise<void> => {
  for (const entry of params.snapshot) {
    const absolutePath = path.join(params.workspaceRoot, entry.relativePath);
    if (entry.content === null) {
      await rm(absolutePath, { force: true });
      continue;
    }
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, entry.content);
  }
};

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
    const capsule = resolveWorkspaceRuntimeCapsule(params);
    await this.#quiesce({
      boundaryHash: params.target.boundaryHash,
      stage: params.stage,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug: params.workspaceSlug,
    });
    const settingsSnapshot = await readWorkspaceSettingsRollbackSnapshot(
      capsule.settingsFile
    );
    const runtimeSnapshot = await readRollbackIgnoredRuntimeSnapshot({
      capsule,
      workspaceRoot: params.workspaceRoot,
    });
    await this.#git.resetHard({
      hash: params.target.boundaryHash,
      workspaceRoot: params.workspaceRoot,
    });
    await writeCurrentRuntimeGitignore(capsule.gitignoreFile);
    await this.#git.cleanWorktree({ workspaceRoot: params.workspaceRoot });
    await writeCurrentRuntimeGitignore(capsule.gitignoreFile);
    await restoreRollbackIgnoredRuntimeSnapshot({
      snapshot: runtimeSnapshot,
      workspaceRoot: params.workspaceRoot,
    });
    await restoreWorkspaceSettingsRollbackSnapshot({
      settingsFile: capsule.settingsFile,
      snapshot: settingsSnapshot,
    });
    await untrackWorkspaceRollbackIgnoredRuntimePaths({
      capsule,
      workspaceRoot: params.workspaceRoot,
    });
    await untrackWorkspaceSettingsForRollback({
      settingsFile: capsule.settingsFile,
      workspaceRoot: params.workspaceRoot,
    });
    const projection = await this.rebuildProjection(params);
    const clearCommit = await this.#git.commit({
      allowEmpty: true,
      commitMessage: buildWorkflowClearCommitMessage(params.stage),
      paths: [
        path.relative(params.workspaceRoot, projection.registryPath),
        capsule.gitignoreFile.relativePath,
      ],
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
    const registryPath = await this.#registryStore.write({
      ...params,
      registry: prunedRegistry,
    });
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
