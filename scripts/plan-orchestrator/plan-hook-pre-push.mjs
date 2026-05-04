import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getGitState } from "./plan-git-state.mjs";
import { validatePlanMarkdown } from "./plan-validator.mjs";

const TODO_PLAN_PATH = "doc/TODO/todo-plan.md";

const hasSingleIssue = (validation, code) =>
  validation.issues.length === 1 && validation.issues[0].code === code;

export const evaluatePrePushGuard = ({ gitState, markdown }) => {
  const structuralValidation = validatePlanMarkdown(markdown);

  if (hasSingleIssue(structuralValidation, "PLAN_STATE_BLOCK_MISSING")) {
    return {
      ok: true,
      reason: "legacy_plan_without_machine_state",
    };
  }

  if (!structuralValidation.state) {
    return {
      issues: structuralValidation.issues,
      ok: false,
      reason: "invalid_plan_state",
    };
  }

  if (structuralValidation.state.executionScopeStatus === "NONE") {
    return { ok: true, reason: "inactive_plan" };
  }

  if (structuralValidation.state.executionScopeStatus !== "ACTIVE") {
    return {
      issues: [
        {
          code: "PLAN_SCOPE_NOT_PUSHABLE",
          message:
            "Plan scope must be ACTIVE with valid state or NONE before push.",
        },
      ],
      ok: false,
      reason: "scope_not_pushable",
    };
  }

  const activeValidation = validatePlanMarkdown(markdown, { gitState });

  if (!activeValidation.ok) {
    return {
      issues: activeValidation.issues,
      ok: false,
      reason: "active_plan_invalid",
    };
  }

  return { ok: true, reason: "active_plan_valid" };
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

  const result = evaluatePrePushGuard({
    gitState: getGitState(cwd),
    markdown: readFileSync(planPath, "utf8"),
  });

  if (result.ok) {
    return;
  }

  console.error(`Plan pre-push guard failed: ${result.reason}`);
  printIssues(result.issues);
  process.exitCode = 1;
};

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
