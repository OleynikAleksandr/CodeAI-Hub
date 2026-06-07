import { execFile } from "node:child_process";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { DiagramModulesManagedGitBoundary } from "./diagram-modules/diagram-modules-managed-git-boundary";
import {
  classifyManagedTerminalDirtyTree,
  type ManagedTerminalStage,
} from "./managed-terminal-dirty-classifier";

const execFileAsync = promisify(execFile);
const TERMINAL_RESIDUE_COMMIT_MESSAGE =
  "chore: commit managed terminal residue";
const TERMINAL_RESIDUE_COMMIT_ATTEMPTS = 3;
const UNKNOWN_WORKSPACE_SLUG = "__unknown_workspace__";
const GITIGNORE_PATH = ".gitignore";
const LOCAL_STATE_ROOT = ".codeai-hub/state";
const LOCAL_STATE_IGNORE_PATTERN = ".codeai-hub/state/";
const WORKSPACE_RUNTIME_IGNORE_PATTERN = ".codeai-hub/*/runtime/";
const WORKSPACE_RUNTIME_PATH_RE = /^\.codeai-hub\/[^/]+\/runtime\//u;
const NEWLINE_RE = /\r?\n/u;
const TRAILING_SLASHES_RE = /\/+$/u;

const resolveWorkspaceSlug = async (
  workspaceRoot: string
): Promise<string | null> => {
  const hubEntries = await readdir(path.join(workspaceRoot, ".codeai-hub"), {
    withFileTypes: true,
  }).catch(() => []);
  const workspaceSlugs = hubEntries
    .filter((entry) => entry.isDirectory() && entry.name !== "state")
    .map((entry) => entry.name);
  return workspaceSlugs.length === 1 ? workspaceSlugs[0] : null;
};

const formatPathList = (paths: readonly string[]): readonly string[] =>
  paths.length > 0
    ? paths.map((filePath) => `- ${filePath}`)
    : ["- No file path was reported."];

const normalizesToIgnorePattern = (line: string, pattern: string): boolean => {
  const normalized = line.trim().replace(TRAILING_SLASHES_RE, "");
  return normalized === pattern.replace(TRAILING_SLASHES_RE, "");
};

const ensureRootGitignorePatterns = async (params: {
  readonly patterns: readonly string[];
  readonly workspaceRoot: string;
}): Promise<void> => {
  const gitignorePath = path.join(params.workspaceRoot, GITIGNORE_PATH);
  const existingContent = await readFile(gitignorePath, "utf8").catch(() => "");
  const lines = existingContent.split(NEWLINE_RE);
  const missingPatterns = params.patterns.filter(
    (pattern) => !lines.some((line) => normalizesToIgnorePattern(line, pattern))
  );
  if (missingPatterns.length === 0) {
    return;
  }
  const prefix =
    existingContent.length === 0 || existingContent.endsWith("\n")
      ? existingContent
      : `${existingContent}\n`;
  await writeFile(
    gitignorePath,
    `${prefix}${missingPatterns.join("\n")}\n`,
    "utf8"
  );
};

const untrackLocalVolatileRuntimePaths = async (
  workspaceRoot: string
): Promise<void> => {
  const { stdout } = await execFileAsync(
    "git",
    ["ls-files", "-z", "--", ".codeai-hub"],
    { cwd: workspaceRoot }
  ).catch(() => ({ stdout: "" }));
  const trackedPaths = stdout
    .split("\0")
    .filter((value) => value.length > 0)
    .filter(
      (relativePath) =>
        relativePath === LOCAL_STATE_ROOT ||
        relativePath.startsWith(`${LOCAL_STATE_ROOT}/`) ||
        WORKSPACE_RUNTIME_PATH_RE.test(relativePath)
    );
  if (trackedPaths.length === 0) {
    return;
  }
  await execFileAsync(
    "git",
    ["rm", "--cached", "--ignore-unmatch", "--", ...trackedPaths],
    { cwd: workspaceRoot }
  );
};

export const formatManagedTerminalDirtyBlocker = (
  paths: readonly string[]
): string =>
  [
    "To finish this step, choose how to handle the files still open in Git.",
    'Select "Commit and finish step" to save them and complete the step, or "Show files" to review them first.',
    "",
    "Files:",
    ...formatPathList(paths),
  ].join("\n");

export const formatManagedTerminalAutoCommitFailure = (
  paths: readonly string[]
): string =>
  [
    "This step could not finish because generated files were not saved automatically.",
    "Confirm the step again. If this repeats, restart Project Manager and try again.",
    "",
    "Files:",
    ...formatPathList(paths),
  ].join("\n");

export const ensureManagedTerminalGitClean = async (params: {
  readonly gitBoundary: DiagramModulesManagedGitBoundary;
  readonly stage: ManagedTerminalStage;
  readonly workspaceRoot: string;
  readonly workspaceSlug?: string | null;
}): Promise<void> => {
  const workspaceSlug =
    params.workspaceSlug ??
    (await resolveWorkspaceSlug(params.workspaceRoot)) ??
    UNKNOWN_WORKSPACE_SLUG;
  await ensureRootGitignorePatterns({
    patterns: [LOCAL_STATE_IGNORE_PATTERN, WORKSPACE_RUNTIME_IGNORE_PATTERN],
    workspaceRoot: params.workspaceRoot,
  });
  await untrackLocalVolatileRuntimePaths(params.workspaceRoot);
  let classification = await classifyManagedTerminalDirtyTree({
    stage: params.stage,
    workspaceRoot: params.workspaceRoot,
    workspaceSlug,
  });

  for (
    let attempt = 0;
    attempt < TERMINAL_RESIDUE_COMMIT_ATTEMPTS;
    attempt += 1
  ) {
    if (classification.clean) {
      return;
    }
    if (classification.unclassifiedPaths.length > 0) {
      throw new Error(
        formatManagedTerminalDirtyBlocker(classification.unclassifiedPaths)
      );
    }
    await params.gitBoundary.commitManagedChanges({
      commitMessage: TERMINAL_RESIDUE_COMMIT_MESSAGE,
      managedPaths: classification.committablePaths,
      workspaceRoot: params.workspaceRoot,
    });
    classification = await classifyManagedTerminalDirtyTree({
      stage: params.stage,
      workspaceRoot: params.workspaceRoot,
      workspaceSlug,
    });
  }

  if (classification.clean) {
    return;
  }
  if (classification.unclassifiedPaths.length > 0) {
    throw new Error(
      formatManagedTerminalDirtyBlocker(classification.unclassifiedPaths)
    );
  }
  throw new Error(
    formatManagedTerminalAutoCommitFailure(classification.committablePaths)
  );
};
