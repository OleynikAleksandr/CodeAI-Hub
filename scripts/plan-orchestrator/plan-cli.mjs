import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getGitState } from "./plan-git-state.mjs";
import { validatePlanMarkdown } from "./plan-validator.mjs";

const TODO_PLAN_PATH = "doc/TODO/todo-plan.md";

const printIssue = (issue) => {
  console.error(`- ${issue.code}: ${issue.message}`);
};

const readPlanMarkdown = (cwd) => {
  const planPath = resolve(cwd, TODO_PLAN_PATH);

  return {
    markdown: readFileSync(planPath, "utf8"),
    planPath,
  };
};

const loadValidation = () => {
  const cwd = process.cwd();
  const { markdown, planPath } = readPlanMarkdown(cwd);

  return validatePlanMarkdown(markdown, {
    gitState: getGitState(cwd),
    sourcePath: planPath,
  });
};

const printStatus = (validation) => {
  if (!validation.state) {
    console.log("Plan state: unavailable");
    console.log("Validation: FAILED");
    for (const issue of validation.issues) {
      printIssue(issue);
    }
    return 1;
  }

  const state = validation.state;
  console.log(`Schema: ${state.schema}`);
  console.log(`Execution Scope Status: ${state.executionScopeStatus}`);
  console.log(`Plan ID: ${state.planId}`);
  console.log(`Branch: ${state.branch}`);
  console.log(`Last Recorded Commit: ${state.lastRecordedCommit}`);
  console.log(`Current Task: ${state.currentTaskId ?? "none"}`);
  console.log(`Expected Commit: ${state.expectedCommitMessage ?? "none"}`);
  console.log(`Debt: ${state.debt === null ? "none" : "open"}`);
  console.log(`Validation: ${validation.ok ? "OK" : "FAILED"}`);

  if (!validation.ok) {
    for (const issue of validation.issues) {
      printIssue(issue);
    }
  }

  return validation.ok ? 0 : 1;
};

const printValidate = (validation) => {
  if (validation.ok) {
    console.log("Plan validation: OK");
    return 0;
  }

  console.error("Plan validation: FAILED");
  for (const issue of validation.issues) {
    printIssue(issue);
  }

  return 1;
};

const main = () => {
  const command = process.argv[2];

  if (command === "status") {
    process.exitCode = printStatus(loadValidation());
    return;
  }

  if (command === "validate") {
    process.exitCode = printValidate(loadValidation());
    return;
  }

  console.error(
    "Usage: node scripts/plan-orchestrator/plan-cli.mjs <status|validate>"
  );
  process.exitCode = 2;
};

main();
