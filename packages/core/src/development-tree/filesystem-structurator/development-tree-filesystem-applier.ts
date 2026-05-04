import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import type {
  DevelopmentTreeFilesystemDirectoryPlan,
  DevelopmentTreeFilesystemPathPlan,
} from "./development-tree-filesystem-paths";

export interface DevelopmentTreeFilesystemApplyResult {
  readonly conflicts: readonly DevelopmentTreeFilesystemDirectoryPlan[];
  readonly created: readonly DevelopmentTreeFilesystemDirectoryPlan[];
  readonly existing: readonly DevelopmentTreeFilesystemDirectoryPlan[];
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

    return { created, existing, conflicts };
  }
}
