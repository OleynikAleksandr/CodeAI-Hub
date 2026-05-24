import { execFile } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { WorkflowStageId } from "../watcher/watcher-types";

const execFileAsync = promisify(execFile);
const GIT_AUTHOR_EMAIL = "codeai-hub@example.local";
const GIT_AUTHOR_NAME = "CodeAI Hub";
const DIAGRAM_INPUT_CHECKPOINT_SUBJECT =
  "docs: checkpoint managed workflow inputs";
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
  readonly removedGitMetadata?: boolean;
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

const diagramModulesManagedScaffoldPathspecs = (): readonly string[] => [
  ".husky",
  "doc",
  "node_modules",
  "package-lock.json",
  "package.json",
  "scripts",
  "tsconfig.base.json",
  "tsconfig.json",
  ".gitignore",
  ".npmrc",
];

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
    const boundary = await this.resolveBoundary({ ...params, stage });
    if (!boundary) {
      return this.failure(stage, "stage_commit_boundary_missing");
    }

    await this.git(params.workspaceRoot, [
      "restore",
      "--source",
      boundary.sourceCommit,
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
    if (boundary.removeManagedScaffold) {
      await this.removePathspecs(
        params.workspaceRoot,
        diagramModulesManagedScaffoldPathspecs()
      );
    }
    await this.git(params.workspaceRoot, ["add", "-A", "--", "."]);
    const hasStagedChanges = await this.hasStagedChanges(params.workspaceRoot);
    if (!hasStagedChanges) {
      if (boundary.removeGitMetadata) {
        await this.removeGitMetadata(params.workspaceRoot);
      }
      return {
        boundaryCommit: boundary.sourceCommit,
        handled: true,
        reason: "already_at_boundary",
        removedGitMetadata: boundary.removeGitMetadata,
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
    if (boundary.removeGitMetadata) {
      await this.removeGitMetadata(params.workspaceRoot);
    }
    return {
      boundaryCommit: boundary.sourceCommit,
      handled: true,
      reason: null,
      removedGitMetadata: boundary.removeGitMetadata,
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
      removedGitMetadata: false,
      rollbackCommit: null,
      stage,
    };
  }

  private async resolveBoundary(params: {
    readonly stage: ManagedRollbackStage;
    readonly workspaceRoot: string;
    readonly workspaceSlug: string;
  }): Promise<{
    readonly removeGitMetadata: boolean;
    readonly removeManagedScaffold: boolean;
    readonly sourceCommit: string;
  } | null> {
    if (params.stage === "diagram_modules") {
      const checkpointCommit = await this.firstCommitBySubject(
        params.workspaceRoot,
        DIAGRAM_INPUT_CHECKPOINT_SUBJECT
      );
      if (checkpointCommit) {
        return {
          removeGitMetadata: !(await this.parentCommit(
            params.workspaceRoot,
            checkpointCommit
          )),
          removeManagedScaffold: true,
          sourceCommit: checkpointCommit,
        };
      }
    }
    const firstStageCommit = await this.firstStageCommit(params);
    if (!firstStageCommit) {
      return null;
    }
    const parentCommit = await this.parentCommit(
      params.workspaceRoot,
      firstStageCommit
    );
    return parentCommit
      ? {
          removeGitMetadata: false,
          removeManagedScaffold: false,
          sourceCommit: parentCommit,
        }
      : null;
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

  private async firstCommitBySubject(
    workspaceRoot: string,
    subject: string
  ): Promise<string | null> {
    const output = await this.git(workspaceRoot, [
      "log",
      "--reverse",
      "--format=%H%x00%s",
    ]);
    for (const line of output.split("\n")) {
      const [hash, commitSubject] = line.split("\0");
      if (hash && commitSubject === subject) {
        return hash;
      }
    }
    return null;
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

  private async removeGitMetadata(workspaceRoot: string): Promise<void> {
    await rm(path.join(workspaceRoot, ".git"), {
      force: true,
      recursive: true,
    });
  }

  private async removePathspecs(
    workspaceRoot: string,
    pathspecs: readonly string[]
  ): Promise<void> {
    await Promise.all(
      pathspecs.map((pathspec) =>
        rm(path.join(workspaceRoot, pathspec), {
          force: true,
          recursive: true,
        })
      )
    );
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
