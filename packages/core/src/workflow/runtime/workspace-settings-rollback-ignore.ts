import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type {
  WorkspaceRuntimeCapsule,
  WorkspaceRuntimePath,
} from "./workspace-runtime-capsule";

const execFileAsync = promisify(execFile);
const GIT_STATUS_PATH_OFFSET = 3;
const TRAILING_SLASHES_RE = /\/+$/u;

const extractGitStatusPath = (entry: string): string =>
  entry.slice(GIT_STATUS_PATH_OFFSET).trim();

const trimTrailingSlash = (value: string): string =>
  value.replace(TRAILING_SLASHES_RE, "");

const isSameOrDescendantPath = (candidate: string, root: string): boolean => {
  const normalizedCandidate = trimTrailingSlash(candidate);
  const normalizedRoot = trimTrailingSlash(root);
  return (
    normalizedCandidate === normalizedRoot ||
    normalizedCandidate.startsWith(`${normalizedRoot}/`)
  );
};

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

const buildProviderNativeSessionRoots = (
  capsule: WorkspaceRuntimeCapsule
): readonly string[] =>
  Object.values(capsule.providerHomes).map((providerHome) =>
    path.posix.join(providerHome.relativePath, "sessions")
  );

const buildRollbackIgnoredRuntimeRoots = (
  capsule: WorkspaceRuntimeCapsule
): readonly string[] => [
  capsule.settingsRoot.relativePath,
  capsule.localizationRoot.relativePath,
  ...buildProviderNativeSessionRoots(capsule),
];

export const isWorkspaceRollbackIgnoredRuntimePath = (params: {
  readonly capsule: WorkspaceRuntimeCapsule;
  readonly relativePath: string;
}): boolean =>
  buildRollbackIgnoredRuntimeRoots(params.capsule).some((root) =>
    isSameOrDescendantPath(params.relativePath, root)
  );

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

export const filterWorkspaceRollbackIgnoredGitStatusEntries = (params: {
  readonly capsule: WorkspaceRuntimeCapsule;
  readonly entries: readonly string[];
}): readonly string[] =>
  params.entries.filter(
    (entry) =>
      !isWorkspaceRollbackIgnoredRuntimePath({
        capsule: params.capsule,
        relativePath: extractGitStatusPath(entry),
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

export const untrackWorkspaceRollbackIgnoredRuntimePaths = async (params: {
  readonly capsule: WorkspaceRuntimeCapsule;
  readonly workspaceRoot: string;
}): Promise<void> => {
  const { stdout } = await execFileAsync(
    "git",
    ["ls-files", "-z", "--", params.capsule.workspaceCapsuleRoot.relativePath],
    { cwd: params.workspaceRoot }
  ).catch(() => ({ stdout: "" }));
  const ignoredPaths = stdout
    .split("\0")
    .filter((value) => value.length > 0)
    .filter((relativePath) =>
      isWorkspaceRollbackIgnoredRuntimePath({
        capsule: params.capsule,
        relativePath,
      })
    );
  if (ignoredPaths.length === 0) {
    return;
  }
  await execFileAsync(
    "git",
    ["rm", "--cached", "--ignore-unmatch", "--", ...ignoredPaths],
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
