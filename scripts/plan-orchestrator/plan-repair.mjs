import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  clearPlanDebtFile,
  getRepositoryDebtPath,
  readPlanDebtFile,
} from "./plan-debt.mjs";
import { getGitState } from "./plan-git-state.mjs";
import { updatePlanState } from "./plan-markdown-updater.mjs";
import { finalizePlanTransaction } from "./plan-transaction.mjs";

const TODO_PLAN_PATH = "doc/TODO/todo-plan.md";

const getHeadSubject = (cwd) =>
  execFileSync("git", ["log", "-1", "--pretty=%s"], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

export const repairPlanMarkdown = ({ debt, head, markdown, subject }) => {
  if (!debt) {
    return { markdown, reason: "no_debt" };
  }

  const commitSucceeded =
    head !== debt.preCommitHead && subject === debt.expectedCommitMessage;

  if (commitSucceeded) {
    return {
      markdown: finalizePlanTransaction({
        commitHash: head,
        debtPath: debt.debtPath,
        markdown,
        taskId: debt.taskId,
      }),
      reason: "commit_succeeded_hash_missing",
    };
  }

  return {
    markdown: updatePlanState(markdown, (state) => ({
      ...state,
      executionScopeStatus: "BLOCKED",
    })),
    reason: "unsafe_blocked",
  };
};

export const runPlanRepair = (cwd = process.cwd()) => {
  const planPath = resolve(cwd, TODO_PLAN_PATH);
  const debtPath = getRepositoryDebtPath(cwd);
  const debt = readPlanDebtFile(debtPath);
  const result = repairPlanMarkdown({
    debt: debt ? { ...debt, debtPath } : null,
    head: getGitState(cwd).head,
    markdown: readFileSync(planPath, "utf8"),
    subject: getHeadSubject(cwd),
  });

  writeFileSync(planPath, result.markdown, "utf8");

  if (result.reason === "commit_succeeded_hash_missing") {
    clearPlanDebtFile(debtPath);
  }

  console.log(`Plan repair: ${result.reason}`);
};
