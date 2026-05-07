import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ADOPTION_COMMIT_MESSAGE = "chore: initialize managed workflow baseline";
const ADOPTED_PATHS: readonly string[] = [
  ".gitignore",
  ".husky",
  "package.json",
  "scripts/plan-orchestrator",
  "doc/TODO",
  ".codeai-hub",
];

export interface ManagedWorkspaceAdoptionCommitResult {
  readonly commitCreated: boolean;
  readonly commitMessage: string;
  readonly skippedReason: "existing_head" | "nothing_to_commit" | null;
}

export type ManagedWorkspaceAdoptionCommandRunner = (
  command: string,
  args: readonly string[],
  options: {
    readonly cwd: string;
    readonly env?: NodeJS.ProcessEnv;
  }
) => Promise<{
  readonly stdout: string;
}>;

export interface ManagedWorkspaceAdoptionCommitterOptions {
  readonly commandRunner?: ManagedWorkspaceAdoptionCommandRunner;
}

export class ManagedWorkspaceAdoptionCommitter {
  readonly #commandRunner: ManagedWorkspaceAdoptionCommandRunner;

  constructor(options: ManagedWorkspaceAdoptionCommitterOptions = {}) {
    this.#commandRunner = options.commandRunner ?? runCommand;
  }

  async commitInitialBaseline(
    workspaceRoot: string
  ): Promise<ManagedWorkspaceAdoptionCommitResult> {
    if (await this.#hasHead(workspaceRoot)) {
      return result(false, "existing_head");
    }

    await this.#commandRunner("git", ["add", "--", ...ADOPTED_PATHS], {
      cwd: workspaceRoot,
    });
    if (!(await this.#hasStagedChanges(workspaceRoot))) {
      return result(false, "nothing_to_commit");
    }

    await this.#commandRunner(
      "git",
      ["-c", "core.hooksPath=", "commit", "-m", ADOPTION_COMMIT_MESSAGE],
      {
        cwd: workspaceRoot,
        env: {
          ...process.env,
          GIT_AUTHOR_EMAIL: "managed-workspace@codeai-hub.local",
          GIT_AUTHOR_NAME: "CodeAI Hub",
          GIT_COMMITTER_EMAIL: "managed-workspace@codeai-hub.local",
          GIT_COMMITTER_NAME: "CodeAI Hub",
        },
      }
    );

    return result(true, null);
  }

  async #hasHead(workspaceRoot: string): Promise<boolean> {
    try {
      await this.#commandRunner("git", ["rev-parse", "--verify", "HEAD"], {
        cwd: workspaceRoot,
      });
      return true;
    } catch {
      return false;
    }
  }

  async #hasStagedChanges(workspaceRoot: string): Promise<boolean> {
    try {
      await this.#commandRunner("git", ["diff", "--cached", "--quiet"], {
        cwd: workspaceRoot,
      });
      return false;
    } catch {
      return true;
    }
  }
}

const result = (
  commitCreated: boolean,
  skippedReason: ManagedWorkspaceAdoptionCommitResult["skippedReason"]
): ManagedWorkspaceAdoptionCommitResult => ({
  commitCreated,
  commitMessage: ADOPTION_COMMIT_MESSAGE,
  skippedReason,
});

const runCommand: ManagedWorkspaceAdoptionCommandRunner = async (
  command,
  args,
  options
) => {
  const { stdout } = await execFileAsync(command, [...args], {
    cwd: options.cwd,
    env: options.env,
  });
  return { stdout };
};
