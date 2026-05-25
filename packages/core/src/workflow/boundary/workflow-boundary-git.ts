import { execFile } from "node:child_process";
import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type {
  WorkflowBoundaryCommitResult,
  WorkflowBoundaryGitCleanParams,
  WorkflowBoundaryGitCommitParams,
  WorkflowBoundaryGitResetParams,
} from "./workflow-boundary-model";

const execFileAsync = promisify(execFile);
const DEFAULT_RETRY_DELAYS_MS = [100, 250, 500, 1000, 2000, 4000] as const;
const GENERATED_OUTPUT_SEGMENTS = new Set([
  "build",
  "coverage",
  "dist",
  "node_modules",
]);
const GIT_AUTHOR_EMAIL = "codeai-hub@example.local";
const GIT_AUTHOR_NAME = "CodeAI Hub";
const GIT_EXCLUDED_PATHS = [
  ":(exclude,glob)**/node_modules/**",
  ":(exclude,glob)**/dist/**",
  ":(exclude,glob)**/build/**",
  ":(exclude,glob)**/coverage/**",
] as const;
const GIT_INDEX_LOCK_RE =
  /index\.lock|Unable to create .*\.git\/index\.lock|Another git process seems to be running/iu;
const BACKSLASH_RE = /\\/gu;
const LEADING_DOT_SLASH_RE = /^\.\//u;
const TRAILING_SLASH_RE = /\/+$/u;

interface GitCommandResult {
  readonly exitCode: number;
  readonly stdout: string;
}

interface GitCommandError extends Error {
  readonly code?: unknown;
  readonly stderr?: unknown;
  readonly stdout?: unknown;
}

export interface WorkflowBoundaryGitOptions {
  readonly retryDelaysMs?: readonly number[];
  readonly sleep?: (ms: number) => Promise<void>;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const normalizeWorkspaceRoot = (workspaceRoot: string): string =>
  path.resolve(workspaceRoot);

const normalizePathSpec = (value: string): string =>
  value
    .trim()
    .replace(BACKSLASH_RE, "/")
    .replace(LEADING_DOT_SLASH_RE, "")
    .replace(TRAILING_SLASH_RE, "");

const isGeneratedOutputPath = (value: string): boolean =>
  normalizePathSpec(value)
    .split("/")
    .some((segment) => GENERATED_OUTPUT_SEGMENTS.has(segment));

const filterPathSpecs = (paths: readonly string[]): readonly string[] =>
  paths.map(normalizePathSpec).filter((value) => {
    return value.length > 0 && !isGeneratedOutputPath(value);
  });

const extractGitErrorText = (error: unknown): string => {
  if (!(error instanceof Error)) {
    return String(error);
  }
  const gitError = error as GitCommandError;
  return [error.message, gitError.stderr, gitError.stdout]
    .filter((value): value is string => typeof value === "string")
    .join("\n");
};

const isGitIndexLockError = (error: unknown): boolean =>
  GIT_INDEX_LOCK_RE.test(extractGitErrorText(error));

const readExitCode = (error: unknown): number | null => {
  const code = (error as GitCommandError | null)?.code;
  return typeof code === "number" ? code : null;
};

const removeMacMetadata = async (directory: string): Promise<void> => {
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    () => []
  );
  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.name === ".DS_Store") {
      await rm(absolutePath, { force: true });
      continue;
    }
    if (entry.isDirectory() && entry.name !== ".git") {
      await removeMacMetadata(absolutePath);
    }
  }
};

export class WorkflowBoundaryGit {
  private static readonly workspaceQueues = new Map<string, Promise<void>>();
  private readonly retryDelaysMs: readonly number[];
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: WorkflowBoundaryGitOptions = {}) {
    this.retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
    this.sleep = options.sleep ?? sleep;
  }

  async commit(
    params: WorkflowBoundaryGitCommitParams
  ): Promise<WorkflowBoundaryCommitResult> {
    return await this.runExclusive(params.workspaceRoot, async () => {
      await this.ensureRepositoryUnlocked(params.workspaceRoot);
      await removeMacMetadata(params.workspaceRoot);
      const paths =
        params.paths === undefined ? [] : filterPathSpecs(params.paths);
      if (paths.length === 0 && !params.allowEmpty) {
        return {
          hash: await this.revParseHead(params.workspaceRoot),
          noStagedChanges: true,
        };
      }
      await this.stagePaths(params.workspaceRoot, paths);
      const diff = await this.runGitCommand(
        params.workspaceRoot,
        ["diff", "--cached", "--quiet", "--"],
        { allowedExitCodes: [1] }
      );
      if (diff.exitCode === 0 && !params.allowEmpty) {
        return {
          hash: await this.revParseHead(params.workspaceRoot),
          noStagedChanges: true,
        };
      }
      await this.git(params.workspaceRoot, [
        "commit",
        ...(params.allowEmpty ? ["--allow-empty"] : []),
        "-m",
        params.commitMessage,
      ]);
      return {
        hash: await this.revParseHead(params.workspaceRoot),
        noStagedChanges: diff.exitCode === 0,
      };
    });
  }

  async resetHard(params: WorkflowBoundaryGitResetParams): Promise<void> {
    await this.runExclusive(params.workspaceRoot, async () => {
      await this.ensureRepositoryUnlocked(params.workspaceRoot);
      await this.git(params.workspaceRoot, ["reset", "--hard", params.hash]);
    });
  }

  async cleanPaths(params: WorkflowBoundaryGitCleanParams): Promise<void> {
    await this.runExclusive(params.workspaceRoot, async () => {
      const paths = filterPathSpecs(params.paths);
      if (paths.length === 0) {
        return;
      }
      await this.ensureRepositoryUnlocked(params.workspaceRoot);
      await this.git(params.workspaceRoot, ["clean", "-fd", "--", ...paths]);
    });
  }

  async ensureRepository(workspaceRoot: string): Promise<void> {
    await this.runExclusive(workspaceRoot, async () => {
      await this.ensureRepositoryUnlocked(workspaceRoot);
    });
  }

  async revParseHead(workspaceRoot: string): Promise<string> {
    return await this.git(workspaceRoot, ["rev-parse", "--short", "HEAD"]);
  }

  async statusPorcelain(workspaceRoot: string): Promise<readonly string[]> {
    return await this.runExclusive(workspaceRoot, async () => {
      await this.ensureRepositoryUnlocked(workspaceRoot);
      await removeMacMetadata(workspaceRoot);
      const output = await this.git(workspaceRoot, ["status", "--porcelain"]);
      return output.length > 0 ? output.split("\n") : [];
    });
  }

  private async ensureRepositoryUnlocked(workspaceRoot: string): Promise<void> {
    if (
      !(await this.tryGit(workspaceRoot, [
        "rev-parse",
        "--is-inside-work-tree",
      ]))
    ) {
      try {
        await this.git(workspaceRoot, ["init"]);
      } catch (error) {
        if (
          !(await this.tryGit(workspaceRoot, [
            "rev-parse",
            "--is-inside-work-tree",
          ]))
        ) {
          throw error;
        }
      }
    }
    if (!(await this.tryGit(workspaceRoot, ["config", "user.email"]))) {
      await this.git(workspaceRoot, ["config", "user.email", GIT_AUTHOR_EMAIL]);
    }
    if (!(await this.tryGit(workspaceRoot, ["config", "user.name"]))) {
      await this.git(workspaceRoot, ["config", "user.name", GIT_AUTHOR_NAME]);
    }
  }

  private async stagePaths(
    workspaceRoot: string,
    paths: readonly string[]
  ): Promise<void> {
    if (paths.length === 0) {
      return;
    }
    const pathspecs = paths.includes(".")
      ? [...paths, ...GIT_EXCLUDED_PATHS]
      : paths;
    await this.git(workspaceRoot, ["add", "-A", "--", ...pathspecs]);
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
  ): Promise<GitCommandResult> {
    for (let attempt = 0; ; attempt += 1) {
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
        if (isGitIndexLockError(error) && attempt < this.retryDelaysMs.length) {
          await this.sleep(this.retryDelaysMs[attempt] ?? 0);
          continue;
        }
        if (isGitIndexLockError(error)) {
          throw new Error(
            [
              "Workflow boundary Git could not acquire the repository index lock after retrying.",
              `Lock path: ${path.join(workspaceRoot, ".git", "index.lock")}`,
              "Close other Git processes or remove the stale lock, then retry the workflow action.",
              "",
              extractGitErrorText(error),
            ].join("\n")
          );
        }
        throw error;
      }
    }
  }

  private async runExclusive<T>(
    workspaceRoot: string,
    task: () => Promise<T>
  ): Promise<T> {
    const key = normalizeWorkspaceRoot(workspaceRoot);
    const previous =
      WorkflowBoundaryGit.workspaceQueues.get(key) ?? Promise.resolve();
    let release: () => void = () => undefined;
    const current = previous
      .catch(() => undefined)
      .then(
        () =>
          new Promise<void>((resolve) => {
            release = resolve;
          })
      );
    WorkflowBoundaryGit.workspaceQueues.set(key, current);
    await previous.catch(() => undefined);
    try {
      return await task();
    } finally {
      release();
      if (WorkflowBoundaryGit.workspaceQueues.get(key) === current) {
        WorkflowBoundaryGit.workspaceQueues.delete(key);
      }
    }
  }
}
