import { execFile } from "node:child_process";
import { readdir, rm, rmdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const isWithinPath = (root: string, candidate: string): boolean => {
  if (!root) {
    return false;
  }
  const relativePath = path.relative(
    path.resolve(root),
    path.resolve(candidate)
  );
  return Boolean(
    relativePath === "" ||
      (relativePath &&
        !relativePath.startsWith("..") &&
        !path.isAbsolute(relativePath))
  );
};

const createWorktreesRoot = (workspacePath: string): string =>
  path.join(
    path.dirname(workspacePath),
    `${path.basename(workspacePath)}.worktrees`
  );

export const createProductPartWorktreeRoot = (params: {
  readonly partId: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): string =>
  path.join(
    createWorktreesRoot(params.workspacePath),
    params.workspaceSlug,
    "product-parts",
    params.partId
  );

const listGitWorktreePaths = async (
  workspacePath: string
): Promise<readonly string[]> => {
  const result = await execFileAsync(
    "git",
    ["worktree", "list", "--porcelain"],
    { cwd: workspacePath }
  ).catch(() => ({ stdout: "" }));
  return result.stdout
    .split("\n")
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length).trim())
    .filter(Boolean);
};

const directoryHasEntries = async (directoryPath: string): Promise<boolean> =>
  (await readdir(directoryPath).catch(() => [])).length > 0;

const removeEmptyParents = async (params: {
  readonly startPath: string;
  readonly stopPath: string;
}): Promise<void> => {
  let currentPath = params.startPath;
  const stopPath = path.resolve(params.stopPath);
  while (isWithinPath(stopPath, currentPath)) {
    if (await directoryHasEntries(currentPath)) {
      break;
    }
    await rmdir(currentPath).catch(() => null);
    if (path.resolve(currentPath) === stopPath) {
      break;
    }
    currentPath = path.dirname(currentPath);
  }
};

export const removeProductPartWorktrees = async (params: {
  readonly partId: string;
  readonly workspacePath: string;
  readonly workspaceSlug: string;
}): Promise<readonly string[]> => {
  const worktreesRoot = createWorktreesRoot(params.workspacePath);
  const productPartWorktreeRoot = createProductPartWorktreeRoot(params);
  const removedPaths: string[] = [];
  for (const worktreePath of await listGitWorktreePaths(params.workspacePath)) {
    if (!isWithinPath(productPartWorktreeRoot, worktreePath)) {
      continue;
    }
    await execFileAsync(
      "git",
      ["worktree", "remove", "--force", worktreePath],
      { cwd: params.workspacePath }
    ).catch(async () => {
      await rm(worktreePath, { force: true, recursive: true });
    });
    removedPaths.push(path.relative(params.workspacePath, worktreePath));
  }
  await rm(productPartWorktreeRoot, { force: true, recursive: true });
  await removeEmptyParents({
    startPath: path.dirname(productPartWorktreeRoot),
    stopPath: worktreesRoot,
  });
  return removedPaths;
};
