import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const runGit = (args, cwd) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

export const getGitState = (cwd = process.cwd()) => {
  const branch = runGit(["branch", "--show-current"], cwd);
  const head = runGit(["rev-parse", "--short", "HEAD"], cwd);
  const gitDir = runGit(["rev-parse", "--git-dir"], cwd);
  const normalizedGitDir = gitDir.startsWith("/") ? gitDir : join(cwd, gitDir);

  return {
    branch,
    debtExists: existsSync(join(normalizedGitDir, "codeai-plan-debt")),
    head,
  };
};
