import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { resolveWorkspaceRuntimeCapsule } from "../runtime/workspace-runtime-capsule";
import { untrackWorkspaceSettingsForRollback } from "../runtime/workspace-settings-rollback-ignore";
import type { WorkflowStageId } from "../watcher/watcher-types";
import { WorkflowBoundaryGit } from "./workflow-boundary-git";
import {
  getWorkflowBoundaryStageLabel,
  type WorkflowBoundaryCommitResult,
} from "./workflow-boundary-model";

export interface WorkflowStepCommitFacadeOptions {
  readonly git?: WorkflowBoundaryGit;
}

export interface WorkflowStepCommitSession {
  readonly providerId: string;
  readonly providerSessionId?: string;
}

export interface WorkflowStepCommitParams {
  readonly sessions?: readonly WorkflowStepCommitSession[];
  readonly stage: WorkflowStageId;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

export interface WorkflowStepCommitResult {
  readonly commit: WorkflowBoundaryCommitResult;
  readonly stage: WorkflowStageId;
}

const execFileAsync = promisify(execFile);

const buildAcceptedStepCommitMessage = (stage: WorkflowStageId): string =>
  `codeai-step: ${getWorkflowBoundaryStageLabel(stage)} accepted`;

const formatDirtyTreeError = (paths: readonly string[]): string =>
  [
    "Workflow step accepted, but Git is still dirty after the Core commit.",
    "The next workflow step cannot start until these paths are classified, committed, or ignored:",
    ...paths.map((value) => `- ${value}`),
  ].join("\n");

const splitGitPath = (value: string): readonly string[] => value.split("/");

const isProviderRuntimePath = (parts: readonly string[]): boolean =>
  parts.length > 6 &&
  parts[0] === ".codeai-hub" &&
  parts[2] === "runtime" &&
  parts[3] === "providers" &&
  parts[5] === "home";

const isVolatileProviderRuntimePath = (value: string): boolean => {
  const parts = splitGitPath(value);
  if (!isProviderRuntimePath(parts)) {
    return false;
  }
  const providerHomePath = parts.slice(6).join("/");
  return (
    providerHomePath === "models_cache.json" ||
    providerHomePath.endsWith(".sqlite") ||
    providerHomePath.startsWith("shell_snapshots/")
  );
};

const readTrackedCapsulePaths = async (
  workspaceRoot: string,
  capsuleRoot: string
): Promise<readonly string[]> => {
  const { stdout } = await execFileAsync(
    "git",
    ["ls-files", "-z", "--", capsuleRoot],
    { cwd: workspaceRoot }
  ).catch(() => ({ stdout: "" }));
  return stdout.split("\0").filter((value) => value.length > 0);
};

const untrackVolatileProviderRuntimePaths = async (params: {
  readonly capsuleRoot: string;
  readonly workspaceRoot: string;
}): Promise<void> => {
  const trackedPaths = await readTrackedCapsulePaths(
    params.workspaceRoot,
    params.capsuleRoot
  );
  const volatilePaths = trackedPaths.filter(isVolatileProviderRuntimePath);
  if (volatilePaths.length === 0) {
    return;
  }
  await execFileAsync(
    "git",
    ["rm", "--cached", "--ignore-unmatch", "--", ...volatilePaths],
    { cwd: params.workspaceRoot }
  );
};

export class WorkflowStepCommitFacade {
  readonly #git: WorkflowBoundaryGit;

  constructor(options: WorkflowStepCommitFacadeOptions = {}) {
    this.#git = options.git ?? new WorkflowBoundaryGit();
  }

  async commitAcceptedStep(
    params: WorkflowStepCommitParams
  ): Promise<WorkflowStepCommitResult> {
    const capsule = resolveWorkspaceRuntimeCapsule(params);
    await untrackVolatileProviderRuntimePaths({
      capsuleRoot: capsule.workspaceCapsuleRoot.relativePath,
      workspaceRoot: params.workspaceRoot,
    });
    await untrackWorkspaceSettingsForRollback({
      settingsFile: capsule.settingsFile,
      workspaceRoot: params.workspaceRoot,
    });
    const commit = await this.#git.commit({
      allowEmpty: true,
      commitMessage: buildAcceptedStepCommitMessage(params.stage),
      paths: [capsule.workspaceCapsuleRoot.relativePath],
      workspaceRoot: params.workspaceRoot,
    });
    const dirtyPaths = await this.#git.statusPorcelain(params.workspaceRoot);
    if (dirtyPaths.length > 0) {
      throw new Error(formatDirtyTreeError(dirtyPaths));
    }
    return {
      commit,
      stage: params.stage,
    };
  }
}
