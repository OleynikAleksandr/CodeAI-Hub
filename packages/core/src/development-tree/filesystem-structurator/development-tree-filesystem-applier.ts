import type { Dirent } from "node:fs";
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import type {
  DevelopmentTreeFilesystemDirectoryPlan,
  DevelopmentTreeFilesystemPathPlan,
} from "./development-tree-filesystem-paths";

export type DevelopmentTreeObservedDirectoryContentState =
  | "empty"
  | "populated";

export interface DevelopmentTreeFilesystemObservedDirectory {
  readonly absolutePath: string;
  readonly contentState: DevelopmentTreeObservedDirectoryContentState;
  readonly relativePath: string;
}

export interface DevelopmentTreeFilesystemApplyResult {
  readonly conflicts: readonly DevelopmentTreeFilesystemDirectoryPlan[];
  readonly created: readonly DevelopmentTreeFilesystemDirectoryPlan[];
  readonly existing: readonly DevelopmentTreeFilesystemDirectoryPlan[];
  readonly observedDirectories: readonly DevelopmentTreeFilesystemObservedDirectory[];
}

const readDirectoryState = async (
  directory: DevelopmentTreeFilesystemDirectoryPlan
): Promise<"directory" | "missing" | "other"> => {
  const fileStat = await stat(directory.absolutePath).catch(() => null);
  if (!fileStat) {
    return "missing";
  }
  return fileStat.isDirectory() ? "directory" : "other";
};

const isUnderConflictRoot = (
  directory: DevelopmentTreeFilesystemDirectoryPlan,
  conflictRoots: readonly string[]
): boolean =>
  conflictRoots.some((root) =>
    directory.absolutePath.startsWith(`${root}${path.sep}`)
  );

const listDirectoryEntries = async (
  absolutePath: string
): Promise<readonly Dirent[]> =>
  await readdir(absolutePath, { withFileTypes: true }).catch(() => []);

const collectObservedDirectories = async (params: {
  readonly absolutePath: string;
  readonly observed: DevelopmentTreeFilesystemObservedDirectory[];
  readonly relativePath: string;
}): Promise<void> => {
  const entries = await listDirectoryEntries(params.absolutePath);
  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const absolutePath = path.join(params.absolutePath, entry.name);
    const relativePath = path.posix.join(params.relativePath, entry.name);
    const childEntries = await listDirectoryEntries(absolutePath);
    params.observed.push({
      absolutePath,
      relativePath,
      contentState: childEntries.length === 0 ? "empty" : "populated",
    });
    await collectObservedDirectories({
      absolutePath,
      relativePath,
      observed: params.observed,
    });
  }
};

export class DevelopmentTreeFilesystemApplier {
  async apply(
    plan: DevelopmentTreeFilesystemPathPlan
  ): Promise<DevelopmentTreeFilesystemApplyResult> {
    const created: DevelopmentTreeFilesystemDirectoryPlan[] = [];
    const existing: DevelopmentTreeFilesystemDirectoryPlan[] = [];
    const conflicts: DevelopmentTreeFilesystemDirectoryPlan[] = [];
    const conflictRoots: string[] = [];

    await mkdir(plan.rootAbsolutePath, { recursive: true });
    for (const directory of plan.directories) {
      if (isUnderConflictRoot(directory, conflictRoots)) {
        continue;
      }
      const state = await readDirectoryState(directory);
      if (state === "directory") {
        existing.push(directory);
        continue;
      }
      if (state === "other") {
        conflicts.push(directory);
        conflictRoots.push(directory.absolutePath);
        continue;
      }
      await mkdir(directory.absolutePath, { recursive: true });
      created.push(directory);
    }
    const observedDirectories: DevelopmentTreeFilesystemObservedDirectory[] =
      [];
    await collectObservedDirectories({
      absolutePath: plan.rootAbsolutePath,
      relativePath: plan.rootRelativePath,
      observed: observedDirectories,
    });

    return { created, existing, conflicts, observedDirectories };
  }
}
