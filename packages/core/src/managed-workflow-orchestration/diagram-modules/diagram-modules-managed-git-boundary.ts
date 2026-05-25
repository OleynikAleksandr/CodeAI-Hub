import {
  WorkflowBoundaryGit,
  type WorkflowBoundaryGitOptions,
} from "../../workflow/boundary/workflow-boundary-git";

export interface DiagramModulesManagedGitBoundaryOptions
  extends WorkflowBoundaryGitOptions {}

export interface DiagramModulesManagedGitCommitResult {
  readonly hash: string | null;
  readonly noStagedChanges: boolean;
}

export class DiagramModulesManagedGitBoundary {
  readonly #git: WorkflowBoundaryGit;

  constructor(options: DiagramModulesManagedGitBoundaryOptions = {}) {
    this.#git = new WorkflowBoundaryGit(options);
  }

  async commitManagedChanges(params: {
    readonly commitMessage: string;
    readonly managedPaths: readonly string[];
    readonly workspaceRoot: string;
  }): Promise<DiagramModulesManagedGitCommitResult> {
    const commit = await this.#git.commit({
      commitMessage: params.commitMessage,
      paths: params.managedPaths,
      workspaceRoot: params.workspaceRoot,
    });
    return {
      hash: commit.noStagedChanges ? null : commit.hash,
      noStagedChanges: commit.noStagedChanges,
    };
  }
}
