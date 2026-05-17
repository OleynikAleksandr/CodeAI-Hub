import { readdir } from "node:fs/promises";
import path from "node:path";
import type { DiagramModulesManagedGitBoundary } from "./diagram-modules/diagram-modules-managed-git-boundary";
import {
  classifyManagedTerminalDirtyTree,
  type ManagedTerminalStage,
} from "./managed-terminal-dirty-classifier";

const TERMINAL_RESIDUE_COMMIT_MESSAGE =
  "chore: commit managed terminal residue";
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

const formatDirtyBlocker = (paths: readonly string[]): string =>
  [
    "Managed terminal completion is blocked by unclassified dirty files.",
    "Core can commit only classified managed stage, runtime, gate, or formatter residue.",
    "Project Manager must send a Core-approved dirty-tree resolution before this step can turn green.",
    "",
    ...paths.map((filePath) => `- ${filePath}`),
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
  const classification = await classifyManagedTerminalDirtyTree({
    stage: params.stage,
    workspaceRoot: params.workspaceRoot,
    workspaceSlug,
  });
  if (classification.clean) {
    return;
  }
  if (classification.unclassifiedPaths.length > 0) {
    throw new Error(formatDirtyBlocker(classification.unclassifiedPaths));
  }
  await params.gitBoundary.commitManagedChanges({
    commitMessage: TERMINAL_RESIDUE_COMMIT_MESSAGE,
    managedPaths: classification.committablePaths,
    workspaceRoot: params.workspaceRoot,
  });
  const afterCommit = await classifyManagedTerminalDirtyTree({
    stage: params.stage,
    workspaceRoot: params.workspaceRoot,
    workspaceSlug,
  });
  if (afterCommit.clean) {
    return;
  }
  throw new Error(formatDirtyBlocker(afterCommit.unclassifiedPaths));
};
