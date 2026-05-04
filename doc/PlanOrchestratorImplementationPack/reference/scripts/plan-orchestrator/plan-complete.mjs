import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getGitState } from "./plan-git-state.mjs";
import { completeNoCommitTaskAndAdvance } from "./plan-markdown-updater.mjs";
import { parsePlanStateMarkdown } from "./plan-state-parser.mjs";
import { validatePlanMarkdown } from "./plan-validator.mjs";

const TODO_PLAN_PATH = "doc/TODO/todo-plan.md";

const formatIssues = (issues) =>
  issues.map((issue) => `${issue.code}: ${issue.message}`).join("\n");

const assertValidForComplete = ({ result, validation }) => {
  if (!result?.trim()) {
    throw new Error('Usage: npm run plan:complete -- "<result>"');
  }

  if (!validation.ok) {
    throw new Error(
      `Plan validation failed before no-commit completion:\n${formatIssues(
        validation.issues
      )}`
    );
  }

  const { state } = validation;

  if (state.executionScopeStatus !== "ACTIVE") {
    throw new Error("plan:complete requires active execution scope.");
  }

  if (state.expectedCommitMessage !== null) {
    throw new Error(
      `plan:complete can only finish no-commit tasks. Current task expects "${state.expectedCommitMessage}".`
    );
  }
};

export const runPlanComplete = ({ cwd = process.cwd(), result }) => {
  const planPath = resolve(cwd, TODO_PLAN_PATH);
  const markdown = readFileSync(planPath, "utf8");
  const validation = validatePlanMarkdown(markdown, {
    gitState: getGitState(cwd),
    sourcePath: planPath,
  });

  assertValidForComplete({ result, validation });

  const parsed = parsePlanStateMarkdown(markdown, planPath);
  const nextMarkdown = completeNoCommitTaskAndAdvance(markdown, {
    result,
    taskId: parsed.state.currentTaskId,
  });
  const nextState = parsePlanStateMarkdown(nextMarkdown, planPath).state;

  writeFileSync(planPath, nextMarkdown, "utf8");

  console.log(`Completed no-commit task: ${parsed.state.currentTaskId}`);
  console.log(`Current Task: ${nextState.currentTaskId ?? "none"}`);
  console.log(`Expected Commit: ${nextState.expectedCommitMessage ?? "none"}`);
};
