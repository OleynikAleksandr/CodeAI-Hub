import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const LIFECYCLE_COMMIT_MESSAGE = "chore: update managed workspace lifecycle";
const LIFECYCLE_PATHS: readonly string[] = [
  ".gitignore",
  ".husky",
  "package.json",
  "scripts/plan-orchestrator",
];

export interface ManagedWorkspaceLifecycleCommitResult {
  readonly commitCreated: boolean;
  readonly commitMessage: string;
  readonly skippedReason:
    | "missing_head"
    | "nothing_to_commit"
    | "preexisting_staged_changes"
    | null;
}

export class ManagedWorkspaceLifecycleCommitter {
  async commitInstalledLifecycle(
    workspaceRoot: string
  ): Promise<ManagedWorkspaceLifecycleCommitResult> {
    if (!(await hasHead(workspaceRoot))) {
      return result(false, "missing_head");
    }
    if ((await listStagedFiles(workspaceRoot)).length > 0) {
      return result(false, "preexisting_staged_changes");
    }

    await git(workspaceRoot, ["add", "--", ...LIFECYCLE_PATHS]);
    const stagedFiles = await listStagedFiles(workspaceRoot);
    if (stagedFiles.length === 0) {
      return result(false, "nothing_to_commit");
    }

    await git(
      workspaceRoot,
      ["-c", "core.hooksPath=", "commit", "-m", LIFECYCLE_COMMIT_MESSAGE],
      {
        ...process.env,
        GIT_AUTHOR_EMAIL: "managed-workspace@codeai-hub.local",
        GIT_AUTHOR_NAME: "CodeAI Hub",
        GIT_COMMITTER_EMAIL: "managed-workspace@codeai-hub.local",
        GIT_COMMITTER_NAME: "CodeAI Hub",
      }
    );
    return result(true, null);
  }
}

const result = (
  commitCreated: boolean,
  skippedReason: ManagedWorkspaceLifecycleCommitResult["skippedReason"]
): ManagedWorkspaceLifecycleCommitResult => ({
  commitCreated,
  commitMessage: LIFECYCLE_COMMIT_MESSAGE,
  skippedReason,
});

const hasHead = async (workspaceRoot: string): Promise<boolean> => {
  try {
    await git(workspaceRoot, ["rev-parse", "--verify", "HEAD"]);
    return true;
  } catch {
    return false;
  }
};

const listStagedFiles = async (
  workspaceRoot: string
): Promise<readonly string[]> => {
  const stdout = await git(workspaceRoot, ["diff", "--cached", "--name-only"]);
  return stdout
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
};

const git = async (
  workspaceRoot: string,
  args: readonly string[],
  env?: NodeJS.ProcessEnv
): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], {
    cwd: workspaceRoot,
    env,
  });
  return stdout.trim();
};
