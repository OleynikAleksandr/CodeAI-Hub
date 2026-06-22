import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const PLAN_DEBT_FILENAME = "codeai-plan-debt";

const runGit = (args, cwd) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

export const getRepositoryDebtPath = (cwd = process.cwd()) => {
  const gitDir = runGit(["rev-parse", "--git-dir"], cwd);
  const normalizedGitDir = gitDir.startsWith("/") ? gitDir : join(cwd, gitDir);

  return join(normalizedGitDir, PLAN_DEBT_FILENAME);
};

export const createPlanDebtPayload = ({
  expectedCommitMessage,
  preCommitHead,
  rollbackMarkdown = null,
  stage = "commit_pending",
  taskId,
}) => ({
  expectedCommitMessage,
  preCommitHead,
  rollbackMarkdown,
  stage,
  taskId,
});

export const readPlanDebtFile = (debtPath) => {
  if (!existsSync(debtPath)) {
    return null;
  }

  return JSON.parse(readFileSync(debtPath, "utf8"));
};

export const writePlanDebtFile = (debtPath, debt) => {
  writeFileSync(debtPath, `${JSON.stringify(debt, null, 2)}\n`, "utf8");
};

export const clearPlanDebtFile = (debtPath) => {
  rmSync(debtPath, { force: true });
};
