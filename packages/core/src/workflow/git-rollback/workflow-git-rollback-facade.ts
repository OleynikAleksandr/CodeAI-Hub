import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { WorkflowStageId } from "../watcher/watcher-types";

const execFileAsync = promisify(execFile);
const GIT_AUTHOR_EMAIL = "codeai-hub@example.local";
const GIT_AUTHOR_NAME = "CodeAI Hub";
const MANAGED_ROLLBACK_STAGES = [
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
] as const satisfies readonly WorkflowStageId[];

type ManagedRollbackStage = (typeof MANAGED_ROLLBACK_STAGES)[number];

export interface WorkflowGitRollbackResult {
  readonly boundaryCommit: string | null;
  readonly handled: boolean;
  readonly reason: string | null;
  readonly rollbackCommit: string | null;
  readonly stage: WorkflowStageId;
}

interface GitCommandError extends Error {
  readonly code?: unknown;
  readonly stderr?: unknown;
  readonly stdout?: unknown;
}

const readExitCode = (error: unknown): number | null => {
  const code = (error as GitCommandError | null)?.code;
  return typeof code === "number" ? code : null;
};

const isManagedRollbackStage = (
  stage: WorkflowStageId
): stage is ManagedRollbackStage =>
  MANAGED_ROLLBACK_STAGES.includes(stage as ManagedRollbackStage);

const stageDirName = (stage: ManagedRollbackStage): string => {
  if (stage === "application_skeleton") {
    return "application-skeleton";
  }
  if (stage === "diagram_modules") {
    return "diagram-modules";
  }
  return "quality-gates";
};

const generatedBoundaryPathspecs = (
  stage: ManagedRollbackStage,
  workspaceSlug: string
): readonly string[] => {
  if (stage === "diagram_modules") {
    return [
      `.codeai-hub/${workspaceSlug}/development_tree`,
      `.codeai-hub/${workspaceSlug}/continuity/development_tree`,
      "doc/TODO/stages/development-tree",
    ];
  }
  if (stage === "application_skeleton") {
    return ["product-parts"];
  }
  return [];
};

const stageOutputBoundaryPathspecs = (
  stage: ManagedRollbackStage,
  workspaceSlug: string
): readonly string[] => {
  const hubRoot = `.codeai-hub/${workspaceSlug}`;
  if (stage === "diagram_modules") {
    return [
      `${hubRoot}/diagram_modules`,
      `${hubRoot}/development_tree`,
      `${hubRoot}/continuity/development_tree`,
    ];
  }
  if (stage === "application_skeleton") {
    return [
      `${hubRoot}/application_skeleton`,
      `${hubRoot}/workflow/managed/application_skeleton.json`,
      "product-parts",
    ];
  }
  return [
    `${hubRoot}/quality_gates`,
    `${hubRoot}/workflow/managed/quality_gates.json`,
  ];
};

const stageCleanupPathspecs = (
  stage: ManagedRollbackStage,
  workspaceSlug: string
): readonly string[] => {
  const stageIndex = MANAGED_ROLLBACK_STAGES.indexOf(stage);
  const downstreamStages = MANAGED_ROLLBACK_STAGES.slice(stageIndex);
  return [
    `.codeai-hub/${workspaceSlug}/workflow/diagram-modules-progress.json`,
    `.codeai-hub/${workspaceSlug}/workflow/state.json`,
    `.codeai-hub/${workspaceSlug}/workflow/undo-ledger.json`,
    ...downstreamStages.flatMap((item) => [
      `.codeai-hub/${workspaceSlug}/${item}`,
      `.codeai-hub/${workspaceSlug}/continuity/${item}`,
      `.codeai-hub/${workspaceSlug}/workflow/managed/${item}.json`,
      `doc/TODO/stages/${stageDirName(item)}`,
      ...generatedBoundaryPathspecs(item, workspaceSlug),
    ]),
  ];
};

const rollbackCommitMessage = (stage: ManagedRollbackStage): string =>
  `chore: clear workflow stage ${stage}`;

export class WorkflowGitRollbackFacade {
  async rollbackStage(params: {
    readonly stage: WorkflowStageId;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<WorkflowGitRollbackResult> {
    if (!isManagedRollbackStage(params.stage)) {
      return {
        boundaryCommit: null,
        handled: false,
        reason: "stage_not_git_managed",
        rollbackCommit: null,
        stage: params.stage,
      };
    }
    const stage = params.stage;
    if (!(await this.isGitRepository(params.workspaceRoot))) {
      return this.failure(stage, "git_repository_missing");
    }

    await this.ensureGitIdentity(params.workspaceRoot);
    const firstStageCommit = await this.firstStageCommit({ ...params, stage });
    if (!firstStageCommit) {
      return this.failure(stage, "stage_commit_boundary_missing");
    }
    const boundaryCommit = await this.parentCommit(
      params.workspaceRoot,
      firstStageCommit
    );
    if (!boundaryCommit) {
      return this.failure(stage, "stage_parent_boundary_missing");
    }

    await this.git(params.workspaceRoot, [
      "restore",
      "--source",
      boundaryCommit,
      "--staged",
      "--worktree",
      "--",
      ".",
    ]);
    await this.git(params.workspaceRoot, [
      "clean",
      "-fd",
      "--",
      ...stageCleanupPathspecs(stage, params.workspaceSlug),
    ]);
    await this.git(params.workspaceRoot, ["add", "-A", "--", "."]);
    const hasStagedChanges = await this.hasStagedChanges(params.workspaceRoot);
    if (!hasStagedChanges) {
      return {
        boundaryCommit,
        handled: true,
        reason: "already_at_boundary",
        rollbackCommit: null,
        stage,
      };
    }
    await this.git(params.workspaceRoot, [
      "commit",
      "-m",
      rollbackCommitMessage(stage),
    ]);
    const rollbackCommit = await this.git(params.workspaceRoot, [
      "rev-parse",
      "--short",
      "HEAD",
    ]);
    return {
      boundaryCommit,
      handled: true,
      reason: null,
      rollbackCommit,
      stage,
    };
  }

  private failure(
    stage: WorkflowStageId,
    reason: string
  ): WorkflowGitRollbackResult {
    return {
      boundaryCommit: null,
      handled: true,
      reason,
      rollbackCommit: null,
      stage,
    };
  }

  private async ensureGitIdentity(workspaceRoot: string): Promise<void> {
    if (!(await this.tryGit(workspaceRoot, ["config", "user.email"]))) {
      await this.git(workspaceRoot, ["config", "user.email", GIT_AUTHOR_EMAIL]);
    }
    if (!(await this.tryGit(workspaceRoot, ["config", "user.name"]))) {
      await this.git(workspaceRoot, ["config", "user.name", GIT_AUTHOR_NAME]);
    }
  }

  private async firstStageCommit(params: {
    readonly stage: ManagedRollbackStage;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<string | null> {
    const output = await this.git(params.workspaceRoot, [
      "log",
      "--reverse",
      "--format=%H",
      "--",
      ...stageOutputBoundaryPathspecs(params.stage, params.workspaceSlug),
    ]);
    return output.split("\n").find((line) => line.trim().length > 0) ?? null;
  }

  private async parentCommit(
    workspaceRoot: string,
    commitHash: string
  ): Promise<string | null> {
    try {
      return await this.git(workspaceRoot, ["rev-parse", `${commitHash}^`]);
    } catch {
      return null;
    }
  }

  private async hasStagedChanges(workspaceRoot: string): Promise<boolean> {
    const result = await this.runGitCommand(
      workspaceRoot,
      ["diff", "--cached", "--quiet", "--"],
      { allowedExitCodes: [1] }
    );
    return result.exitCode === 1;
  }

  private async isGitRepository(workspaceRoot: string): Promise<boolean> {
    return await this.tryGit(workspaceRoot, [
      "rev-parse",
      "--is-inside-work-tree",
    ]);
  }

  private async git(
    workspaceRoot: string,
    args: readonly string[]
  ): Promise<string> {
    const { stdout } = await this.runGitCommand(workspaceRoot, args);
    return stdout.trim();
  }

  private async tryGit(
    workspaceRoot: string,
    args: readonly string[]
  ): Promise<boolean> {
    try {
      await this.git(workspaceRoot, args);
      return true;
    } catch {
      return false;
    }
  }

  private async runGitCommand(
    workspaceRoot: string,
    args: readonly string[],
    options: { readonly allowedExitCodes?: readonly number[] } = {}
  ): Promise<{ readonly exitCode: number; readonly stdout: string }> {
    try {
      const { stdout } = await execFileAsync("git", args, {
        cwd: workspaceRoot,
      });
      return { exitCode: 0, stdout: stdout.trim() };
    } catch (error) {
      const exitCode = readExitCode(error);
      if (exitCode !== null && options.allowedExitCodes?.includes(exitCode)) {
        const stdout = (error as GitCommandError).stdout;
        return {
          exitCode,
          stdout: typeof stdout === "string" ? stdout.trim() : "",
        };
      }
      throw error;
    }
  }
}
