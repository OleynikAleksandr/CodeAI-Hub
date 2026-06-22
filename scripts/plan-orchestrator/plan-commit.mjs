import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getRepositoryDebtPath } from "./plan-debt.mjs";
import { getGitState } from "./plan-git-state.mjs";
import {
  assertPathsWithinScope,
  extractTaskScopePatterns,
  readDirtyPaths,
} from "./plan-scope-boundary.mjs";
import { parsePlanStateMarkdown } from "./plan-state-parser.mjs";
import {
  beginPlanTransaction,
  finalizePlanTransaction,
} from "./plan-transaction.mjs";
import { validatePlanMarkdown } from "./plan-validator.mjs";

const TODO_PLAN_PATH = "doc/TODO/todo-plan.md";
const TRANSACTION_ENV = "CODEAI_PLAN_TRANSACTION_ACTIVE";

const runGit = (args, cwd, options = {}) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    env: options.env ?? process.env,
    stdio: options.stdio ?? ["ignore", "pipe", "pipe"],
  });

const uniquePaths = (paths) => Array.from(new Set(paths));

const stagePaths = (cwd, paths) => {
  const uniqueDirtyPaths = uniquePaths(paths);

  if (uniqueDirtyPaths.length === 0) {
    return;
  }

  runGit(["add", "-A", "--", "."], cwd);
};

const assertValidForCommit = ({ message, validation }) => {
  if (!validation.ok) {
    const details = validation.issues
      .map((issue) => `${issue.code}: ${issue.message}`)
      .join("\n");
    throw new Error(`Plan validation failed before commit:\n${details}`);
  }

  const { state } = validation;

  if (state.executionScopeStatus !== "ACTIVE") {
    throw new Error("plan:commit requires active execution scope.");
  }

  if (message !== state.expectedCommitMessage) {
    throw new Error(
      `Commit message mismatch. Expected "${state.expectedCommitMessage}", got "${message}".`
    );
  }
};

export const runPlanCommit = ({ cwd = process.cwd(), message }) => {
  if (!message) {
    throw new Error('Usage: npm run plan:commit -- "<message>"');
  }

  const planPath = resolve(cwd, TODO_PLAN_PATH);
  const markdown = readFileSync(planPath, "utf8");
  const gitState = getGitState(cwd);
  const validation = validatePlanMarkdown(markdown, {
    gitState,
    sourcePath: planPath,
  });

  assertValidForCommit({ message, validation });

  const parsed = parsePlanStateMarkdown(markdown, planPath);
  const taskId = parsed.state.currentTaskId;
  const scopePatterns = extractTaskScopePatterns(markdown, taskId);
  assertPathsWithinScope({
    paths: readDirtyPaths(cwd),
    scopePatterns,
  });
  const debtPath = getRepositoryDebtPath(cwd);
  const transaction = beginPlanTransaction({
    debtPath,
    expectedCommitMessage: message,
    markdown,
    preCommitHead: gitState.head,
    taskId,
  });

  writeFileSync(planPath, transaction.markdown, "utf8");
  const transactionDirtyPaths = readDirtyPaths(cwd);
  assertPathsWithinScope({
    paths: transactionDirtyPaths,
    scopePatterns,
  });
  stagePaths(cwd, transactionDirtyPaths);

  runGit(["commit", "-m", message], cwd, {
    env: {
      ...process.env,
      [TRANSACTION_ENV]: "1",
    },
    stdio: "inherit",
  });
  finalizePlanTransaction({
    debtPath,
    markdown: readFileSync(planPath, "utf8"),
  });
};
