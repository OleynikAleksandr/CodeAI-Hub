import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getRepositoryDebtPath, readPlanDebtFile } from "./plan-debt.mjs";
import { getGitState } from "./plan-git-state.mjs";
import { validatePlanMarkdown } from "./plan-validator.mjs";

const TODO_PLAN_PATH = "doc/TODO/todo-plan.md";
const TRANSACTION_ENV = "CODEAI_PLAN_TRANSACTION_ACTIVE";
const TRANSACTION_ALLOWED_ISSUES = new Set([
  "PLAN_CURRENT_TASK_STATUS_INVALID",
  "PLAN_DEBT_EXISTS",
]);

const getCommitSubject = (message) =>
  message
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line !== "" && !line.startsWith("#")) ?? "";

const createIssue = (code, message) => ({ code, message });

export const evaluateCommitMessageGuard = ({
  env = process.env,
  gitState,
  markdown,
  message,
  transactionDebt = null,
}) => {
  const validation = validatePlanMarkdown(markdown, { gitState });
  const isMissingMachineState =
    validation.issues.length === 1 &&
    validation.issues[0].code === "PLAN_STATE_BLOCK_MISSING";

  if (isMissingMachineState) {
    return { ok: true, reason: "legacy_plan_without_machine_state" };
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
        createIssue(
          "PLAN_DIRECT_COMMIT_BLOCKED",
          "Active plan requires Plan Orchestrator transaction."
        ),
      ],
      ok: false,
      reason: "direct_commit_blocked",
    };
  }

  const subject = getCommitSubject(message);
  const expectedMessage =
    transactionDebt?.expectedCommitMessage ??
    validation.state.expectedCommitMessage;

  if (subject !== expectedMessage) {
    return {
      issues: [
        createIssue(
          "PLAN_COMMIT_MESSAGE_MISMATCH",
          `Expected "${expectedMessage}", got "${subject}".`
        ),
      ],
      ok: false,
      reason: "commit_message_mismatch",
    };
  }

  return { ok: true, reason: "transaction_commit_message" };
};

const printIssues = (issues = []) => {
  for (const issue of issues) {
    console.error(`- ${issue.code}: ${issue.message}`);
  }
};

const main = () => {
  const messageFile = process.argv[2];

  if (!messageFile) {
    console.error("Usage: plan-hook-commit-msg.mjs <commit-message-file>");
    process.exitCode = 2;
    return;
  }

  const cwd = process.cwd();
  const planPath = resolve(cwd, TODO_PLAN_PATH);

  if (!existsSync(planPath)) {
    return;
  }

  const result = evaluateCommitMessageGuard({
    env: process.env,
    gitState: getGitState(cwd),
    markdown: readFileSync(planPath, "utf8"),
    message: readFileSync(messageFile, "utf8"),
    transactionDebt: readPlanDebtFile(getRepositoryDebtPath(cwd)),
  });

  if (result.ok) {
    return;
  }

  console.error(`Plan commit-msg guard failed: ${result.reason}`);
  printIssues(result.issues);
  process.exitCode = 1;
};

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
