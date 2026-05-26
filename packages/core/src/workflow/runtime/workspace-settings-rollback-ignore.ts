import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { WorkspaceRuntimePath } from "./workspace-runtime-capsule";

const execFileAsync = promisify(execFile);
const GIT_STATUS_PATH_OFFSET = 3;

const extractGitStatusPath = (entry: string): string =>
  entry.slice(GIT_STATUS_PATH_OFFSET).trim();

export type WorkspaceSettingsRollbackSnapshot =
  | {
      readonly content: string;
      readonly exists: true;
    }
  | {
      readonly exists: false;
    };

const isMissingFileError = (error: unknown): boolean =>
  (error as { readonly code?: unknown }).code === "ENOENT";

const isWorkspaceSettingsGitStatusEntry = (params: {
  readonly entry: string;
  readonly settingsFile: WorkspaceRuntimePath;
}): boolean =>
  extractGitStatusPath(params.entry) === params.settingsFile.relativePath;

export const filterWorkspaceSettingsGitStatusEntries = (params: {
  readonly entries: readonly string[];
  readonly settingsFile: WorkspaceRuntimePath;
}): readonly string[] =>
  params.entries.filter(
    (entry) =>
      !isWorkspaceSettingsGitStatusEntry({
        entry,
        settingsFile: params.settingsFile,
      })
  );

export const untrackWorkspaceSettingsForRollback = async (params: {
  readonly settingsFile: WorkspaceRuntimePath;
  readonly workspaceRoot: string;
}): Promise<void> => {
  await execFileAsync(
    "git",
    [
      "rm",
      "--cached",
      "--ignore-unmatch",
      "--",
      params.settingsFile.relativePath,
    ],
    { cwd: params.workspaceRoot }
  );
};

export const readWorkspaceSettingsRollbackSnapshot = async (
  settingsFile: WorkspaceRuntimePath
): Promise<WorkspaceSettingsRollbackSnapshot> => {
  try {
    return {
      content: await readFile(settingsFile.absolutePath, "utf8"),
      exists: true,
    };
  } catch (error) {
    if (isMissingFileError(error)) {
      return { exists: false };
    }
    throw error;
  }
};

export const restoreWorkspaceSettingsRollbackSnapshot = async (params: {
  readonly settingsFile: WorkspaceRuntimePath;
  readonly snapshot: WorkspaceSettingsRollbackSnapshot;
}): Promise<void> => {
  if (!params.snapshot.exists) {
    await rm(params.settingsFile.absolutePath, { force: true });
    return;
  }
  await mkdir(path.dirname(params.settingsFile.absolutePath), {
    recursive: true,
  });
  await writeFile(
    params.settingsFile.absolutePath,
    params.snapshot.content,
    "utf8"
  );
};
