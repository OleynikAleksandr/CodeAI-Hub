import { execFile } from "node:child_process";
import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DEFAULT_RETRY_DELAYS_MS = [100, 250, 500, 1000, 2000, 4000] as const;
const GIT_AUTHOR_EMAIL = "codeai-hub@example.local";
const GIT_AUTHOR_NAME = "CodeAI Hub";
const GENERATED_OUTPUT_SEGMENTS = new Set([
  "build",
  "coverage",
  "dist",
  "node_modules",
]);
const MANAGED_GIT_EXCLUDED_PATHS = [
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

export interface DiagramModulesManagedGitBoundaryOptions {
  readonly retryDelaysMs?: readonly number[];
  readonly sleep?: (ms: number) => Promise<void>;
}

export interface DiagramModulesManagedGitCommitResult {
  readonly hash: string | null;
  readonly noStagedChanges: boolean;
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const normalizeWorkspaceRoot = (workspaceRoot: string): string =>
  path.resolve(workspaceRoot);

const normalizeManagedPath = (value: string): string =>
  value
    .trim()
    .replace(BACKSLASH_RE, "/")
    .replace(LEADING_DOT_SLASH_RE, "")
    .replace(TRAILING_SLASH_RE, "");

const isGeneratedOutputPath = (value: string): boolean => {
  const normalized = normalizeManagedPath(value);
  return normalized
    .split("/")
    .some((segment) => GENERATED_OUTPUT_SEGMENTS.has(segment));
};

const filterManagedPaths = (
  managedPaths: readonly string[]
): readonly string[] =>
  managedPaths.filter((managedPath) => !isGeneratedOutputPath(managedPath));

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

export class DiagramModulesManagedGitBoundary {
  private static readonly workspaceQueues = new Map<string, Promise<void>>();
  private readonly retryDelaysMs: readonly number[];
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(options: DiagramModulesManagedGitBoundaryOptions = {}) {
    this.retryDelaysMs = options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS;
    this.sleep = options.sleep ?? sleep;
  }

  async commitManagedChanges(params: {
    readonly commitMessage: string;
    readonly managedPaths: readonly string[];
    readonly workspaceRoot: string;
  }): Promise<DiagramModulesManagedGitCommitResult> {
    return await this.runExclusive(params.workspaceRoot, async () => {
      await this.ensureGitRepository(params.workspaceRoot);
      await removeMacMetadata(params.workspaceRoot);
      const managedPaths = filterManagedPaths(params.managedPaths);
      if (managedPaths.length === 0) {
        return { hash: null, noStagedChanges: true };
      }

      await this.git(params.workspaceRoot, [
        "add",
        "--",
        ...managedPaths,
        ...MANAGED_GIT_EXCLUDED_PATHS,
      ]);
      const diff = await this.runGitCommand(
        params.workspaceRoot,
        ["diff", "--cached", "--quiet", "--"],
        { allowedExitCodes: [1] }
      );
      if (diff.exitCode === 0) {
        return { hash: null, noStagedChanges: true };
      }

      await this.git(params.workspaceRoot, [
        "commit",
        "-m",
        params.commitMessage,
      ]);
      const hash = await this.git(params.workspaceRoot, [
        "rev-parse",
        "--short",
        "HEAD",
      ]);
      return { hash, noStagedChanges: false };
    });
  }

  private async ensureGitRepository(workspaceRoot: string): Promise<void> {
    if (
      !(await this.tryGit(workspaceRoot, [
        "rev-parse",
        "--is-inside-work-tree",
      ]))
    ) {
      await this.git(workspaceRoot, ["init"]);
    }
    if (!(await this.tryGit(workspaceRoot, ["config", "user.email"]))) {
      await this.git(workspaceRoot, ["config", "user.email", GIT_AUTHOR_EMAIL]);
    }
    if (!(await this.tryGit(workspaceRoot, ["config", "user.name"]))) {
      await this.git(workspaceRoot, ["config", "user.name", GIT_AUTHOR_NAME]);
    }
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
              "Managed Git commit boundary could not acquire the repository index lock after retrying.",
              `Lock path: ${path.join(workspaceRoot, ".git", "index.lock")}`,
              "Close other Git processes or remove the stale lock, then retry the managed workflow step.",
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
      DiagramModulesManagedGitBoundary.workspaceQueues.get(key) ??
      Promise.resolve();
    let release: () => void = () => undefined;
    const current = previous
      .catch(() => undefined)
      .then(
        () =>
          new Promise<void>((resolve) => {
            release = resolve;
          })
      );
    DiagramModulesManagedGitBoundary.workspaceQueues.set(key, current);
    await previous.catch(() => undefined);
    try {
      return await task();
    } finally {
      release();
      if (
        DiagramModulesManagedGitBoundary.workspaceQueues.get(key) === current
      ) {
        DiagramModulesManagedGitBoundary.workspaceQueues.delete(key);
      }
    }
  }
}
