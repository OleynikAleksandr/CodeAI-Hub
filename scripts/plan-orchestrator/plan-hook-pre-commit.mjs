import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getRepositoryDebtPath, readPlanDebtFile } from "./plan-debt.mjs";
import { getGitState } from "./plan-git-state.mjs";
import {
  extractTaskScopePatterns,
  getOutOfScopePaths,
  readStagedPaths,
} from "./plan-scope-boundary.mjs";
import { validatePlanMarkdown } from "./plan-validator.mjs";

const TODO_PLAN_PATH = "doc/TODO/todo-plan.md";
const TRANSACTION_ENV = "CODEAI_PLAN_TRANSACTION_ACTIVE";
const TRANSACTION_ALLOWED_ISSUES = new Set([
  "PLAN_CURRENT_TASK_STATUS_INVALID",
  "PLAN_DEBT_EXISTS",
]);

export const evaluatePreCommitGuard = ({
  env = process.env,
  gitState,
  markdown,
  stagedFiles = [],
  transactionDebt = null,
}) => {
  const validation = validatePlanMarkdown(markdown, { gitState });
  const isMissingMachineState =
    validation.issues.length === 1 &&
    validation.issues[0].code === "PLAN_STATE_BLOCK_MISSING";

  if (isMissingMachineState) {
    return {
      ok: true,
      reason: "legacy_plan_without_machine_state",
    };
  }

  if (!validation.state) {
    return {
      issues: validation.issues,
      ok: false,
      reason: "invalid_plan_state",
    };
  }

  if (validation.state.executionScopeStatus !== "ACTIVE") {
    return { ok: true, reason: "inactive_plan" };
  }

  const isTransaction = env[TRANSACTION_ENV] === "1";
  const blockingIssues = validation.issues.filter(
    (issue) => !(isTransaction && TRANSACTION_ALLOWED_ISSUES.has(issue.code))
  );

  if (blockingIssues.length > 0) {
    return {
      issues: blockingIssues,
      ok: false,
      reason: "active_plan_invalid",
    };
  }

  if (!isTransaction) {
    return {
      issues: [
        {
          code: "PLAN_DIRECT_COMMIT_BLOCKED",
          message:
            'Active plan requires Plan Orchestrator transaction. Use the planned commit command instead of direct "git commit".',
        },
      ],
      ok: false,
      reason: "direct_commit_blocked",
    };
  }

  const taskId =
    transactionDebt?.taskId ??
    validation.state.debt?.taskId ??
    validation.state.currentTaskId;
  const scopePatterns = extractTaskScopePatterns(markdown, taskId);
  const outOfScopePaths = getOutOfScopePaths(stagedFiles, scopePatterns);

  if (outOfScopePaths.length > 0) {
    return {
      issues: [
        {
          code: "PLAN_STAGED_FILES_OUTSIDE_SCOPE",
          message: `Staged files are outside current task scope: ${outOfScopePaths.join(", ")}.`,
        },
      ],
      ok: false,
      reason: "staged_files_outside_scope",
    };
  }

  return { ok: true, reason: "transaction_commit" };
};

const printIssues = (issues = []) => {
  for (const issue of issues) {
    console.error(`- ${issue.code}: ${issue.message}`);
  }
};

const main = () => {
  const cwd = process.cwd();
  const planPath = resolve(cwd, TODO_PLAN_PATH);

  if (!existsSync(planPath)) {
    return;
  }

  const markdown = readFileSync(planPath, "utf8");
  const result = evaluatePreCommitGuard({
    env: process.env,
    gitState: getGitState(cwd),
    markdown,
    stagedFiles: readStagedPaths(cwd),
    transactionDebt: readPlanDebtFile(getRepositoryDebtPath(cwd)),
  });

  if (result.ok) {
    return;
  }

  console.error(`Plan pre-commit guard failed: ${result.reason}`);
  printIssues(result.issues);
  process.exitCode = 1;
};

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
