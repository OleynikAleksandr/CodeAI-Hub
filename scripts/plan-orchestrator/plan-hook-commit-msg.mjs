import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getGitState } from "./plan-git-state.mjs";
import { validatePlanMarkdown } from "./plan-validator.mjs";

const TODO_PLAN_PATH = "doc/TODO/todo-plan.md";
const TRANSACTION_ENV = "CODEAI_PLAN_TRANSACTION_ACTIVE";

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

  if (subject !== validation.state.expectedCommitMessage) {
    return {
      issues: [
        createIssue(
          "PLAN_COMMIT_MESSAGE_MISMATCH",
          `Expected "${validation.state.expectedCommitMessage}", got "${subject}".`
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
  const result = evaluateCommitMessageGuard({
    env: process.env,
    gitState: getGitState(cwd),
    markdown: readFileSync(resolve(cwd, TODO_PLAN_PATH), "utf8"),
    message: readFileSync(messageFile, "utf8"),
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
