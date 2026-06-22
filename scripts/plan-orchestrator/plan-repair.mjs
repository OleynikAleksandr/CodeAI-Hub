import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  clearPlanDebtFile,
  getRepositoryDebtPath,
  readPlanDebtFile,
} from "./plan-debt.mjs";
import { getGitState } from "./plan-git-state.mjs";
import {
  rollbackPendingCommit,
  updatePlanState,
} from "./plan-markdown-updater.mjs";
import { locateTaskPair } from "./plan-task-locator.mjs";
import { finalizePlanTransaction } from "./plan-transaction.mjs";

const TODO_PLAN_PATH = "doc/TODO/todo-plan.md";

const getHeadSubject = (cwd) =>
  execFileSync("git", ["log", "-1", "--pretty=%s"], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

const canRollbackPendingCommit = (markdown, taskId) => {
  const { pairedCommit, task } = locateTaskPair(markdown, taskId);

  return task.status === "DONE" && pairedCommit.status === "PENDING";
};

export const repairPlanMarkdown = ({ debt, head, markdown, subject }) => {
  if (!debt) {
    return { markdown, reason: "no_debt" };
  }

  const commitSucceeded =
    head !== debt.preCommitHead && subject === debt.expectedCommitMessage;

  if (commitSucceeded) {
    return {
      markdown: finalizePlanTransaction({ debtPath: debt.debtPath, markdown }),
      reason: "commit_succeeded_local_debt_cleared",
    };
  }

  if (
    head === debt.preCommitHead &&
    typeof debt.rollbackMarkdown === "string"
  ) {
    return {
      markdown: debt.rollbackMarkdown,
      reason: "commit_not_created_rolled_back",
    };
  }

  if (
    head === debt.preCommitHead &&
    canRollbackPendingCommit(markdown, debt.taskId)
  ) {
    return {
      markdown: rollbackPendingCommit(markdown, debt.taskId),
      reason: "commit_not_created_rolled_back",
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

  if (
    result.reason === "commit_succeeded_local_debt_cleared" ||
    result.reason === "commit_not_created_rolled_back"
  ) {
    clearPlanDebtFile(debtPath);
  }

  console.log(`Plan repair: ${result.reason}`);
  if (result.reason === "commit_not_created_rolled_back") {
    console.log(
      'Recovery action: stage the intended files if needed, then retry `npm run plan:commit -- "<expected commit message>"`.'
    );
  }
  if (result.reason === "unsafe_blocked") {
    console.log(
      "Recovery action: inspect `npm run plan:status`, resolve the blocker, and do not continue implementation until the plan is repaired."
    );
  }
};
