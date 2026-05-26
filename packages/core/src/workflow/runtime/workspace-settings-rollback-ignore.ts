import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { WorkspaceRuntimePath } from "./workspace-runtime-capsule";

const execFileAsync = promisify(execFile);
const GIT_STATUS_PATH_OFFSET = 3;

const extractGitStatusPath = (entry: string): string =>
  entry.slice(GIT_STATUS_PATH_OFFSET).trim();

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
