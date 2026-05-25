import { resolveWorkspaceRuntimeCapsule } from "../runtime/workspace-runtime-capsule";
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
  readonly runtimeSliceCount: number;
  readonly stage: WorkflowStageId;
}

const buildAcceptedStepCommitMessage = (stage: WorkflowStageId): string =>
  `codeai-step: ${getWorkflowBoundaryStageLabel(stage)} accepted`;

const formatDirtyTreeError = (paths: readonly string[]): string =>
  [
    "Workflow step accepted, but Git is still dirty after the Core commit.",
    "The next workflow step cannot start until these paths are classified, committed, or ignored:",
    ...paths.map((value) => `- ${value}`),
  ].join("\n");

export class WorkflowStepCommitFacade {
  readonly #git: WorkflowBoundaryGit;

  constructor(options: WorkflowStepCommitFacadeOptions = {}) {
    this.#git = options.git ?? new WorkflowBoundaryGit();
  }

  async commitAcceptedStep(
    params: WorkflowStepCommitParams
  ): Promise<WorkflowStepCommitResult> {
    const capsule = resolveWorkspaceRuntimeCapsule(params);
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
      runtimeSliceCount: 0,
      stage: params.stage,
    };
  }
}
