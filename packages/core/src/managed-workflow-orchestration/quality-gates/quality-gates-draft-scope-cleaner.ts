import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const PRE_ACCEPTANCE_INTEGRATION_PATHS = [
  ".husky/pre-commit",
  ".husky/pre-push",
  "bun.lockb",
  "package-lock.json",
  "package.json",
  "pnpm-lock.yaml",
  "scripts/quality-gates",
  "yarn.lock",
] as const;

const splitGitPaths = (stdout: string): readonly string[] =>
  stdout
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

const runGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], {
    cwd: workspaceRoot,
  });
  return stdout;
};

const readTrackedResiduePaths = async (
  workspaceRoot: string
): Promise<readonly string[]> =>
  splitGitPaths(
    await runGit(workspaceRoot, [
      "ls-files",
      "--",
      ...PRE_ACCEPTANCE_INTEGRATION_PATHS,
    ])
  );

const restoreTrackedResidue = async (
  workspaceRoot: string,
  paths: readonly string[]
): Promise<void> => {
  if (paths.length === 0) {
    return;
  }
  await runGit(workspaceRoot, [
    "restore",
    "--staged",
    "--worktree",
    "--",
    ...paths,
  ]);
};

const cleanUntrackedResidue = async (workspaceRoot: string): Promise<void> => {
  await runGit(workspaceRoot, [
    "clean",
    "-fd",
    "--",
    ...PRE_ACCEPTANCE_INTEGRATION_PATHS,
  ]);
};

export const cleanQualityGatesDraftScope = async (params: {
  readonly workspaceRoot: string;
}): Promise<void> => {
  const trackedPaths = await readTrackedResiduePaths(params.workspaceRoot);
  await restoreTrackedResidue(params.workspaceRoot, trackedPaths);
  await cleanUntrackedResidue(params.workspaceRoot);
};
