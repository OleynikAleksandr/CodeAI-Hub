import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runPlanCommit } from "./plan-commit.mjs";
import { runPlanComplete } from "./plan-complete.mjs";
import { getGitState } from "./plan-git-state.mjs";
import { runPlanRepair } from "./plan-repair.mjs";
import { validatePlanMarkdown } from "./plan-validator.mjs";

const TODO_PLAN_PATH = "doc/TODO/todo-plan.md";

const printIssue = (issue) => {
  console.error(`- ${issue.code}: ${issue.message}`);
};

const printRecoveryHint = () => {
  console.error(
    "Recovery: run `npm run plan:status`. If Debt is open, run `npm run plan:repair`, fix the reported blocker, then retry the planned command."
  );
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

  try {
    if (command === "status") {
      process.exitCode = printStatus(loadValidation());
      return;
    }

    if (command === "validate") {
      process.exitCode = printValidate(loadValidation());
      return;
    }

    if (command === "commit") {
      runPlanCommit({ message: process.argv.slice(3).join(" ") });
      return;
    }

    if (command === "complete") {
      runPlanComplete({ result: process.argv.slice(3).join(" ") });
      return;
    }

    if (command === "repair") {
      runPlanRepair();
      return;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    printRecoveryHint();
    process.exitCode = 1;
    return;
  }

  console.error(
    "Usage: node scripts/plan-orchestrator/plan-cli.mjs <status|validate|commit|complete|repair>"
  );
  process.exitCode = 2;
};

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
