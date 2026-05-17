import { readdir } from "node:fs/promises";
import path from "node:path";
import type { DiagramModulesManagedGitBoundary } from "./diagram-modules/diagram-modules-managed-git-boundary";
import {
  classifyManagedTerminalDirtyTree,
  type ManagedTerminalStage,
} from "./managed-terminal-dirty-classifier";

const TERMINAL_RESIDUE_COMMIT_MESSAGE =
  "chore: commit managed terminal residue";
const TERMINAL_RESIDUE_COMMIT_ATTEMPTS = 3;
const UNKNOWN_WORKSPACE_SLUG = "__unknown_workspace__";

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
