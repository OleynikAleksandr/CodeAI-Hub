import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getGitState } from "./plan-git-state.mjs";
import { validatePlanMarkdown } from "./plan-validator.mjs";

const TODO_PLAN_PATH = "doc/TODO/todo-plan.md";

const createWarning = (code, message, recovery) => ({
  code,
  message,
  recovery,
});

const hasSingleIssue = (validation, code) =>
  validation.issues.length === 1 && validation.issues[0].code === code;

const getReachability = ({ cwd, lastRecordedCommit }) => {
  if (lastRecordedCommit === "self") {
    return true;
  }

  try {
    execFileSync(
      "git",
      ["merge-base", "--is-ancestor", lastRecordedCommit, "HEAD"],
      {
        cwd,
        stdio: "ignore",
      }
    );
    return true;
  } catch {
    return false;
  }
};

export const evaluateBranchAdvisory = ({
  gitState,
  lastRecordedCommitReachable,
  markdown,
}) => {
  const validation = validatePlanMarkdown(markdown);

  if (hasSingleIssue(validation, "PLAN_STATE_BLOCK_MISSING")) {
    return { reason: "legacy_plan_without_machine_state", warnings: [] };
  }

  if (!validation.state) {
    return {
      reason: "invalid_plan_state",
      warnings: validation.issues.map((issue) =>
        createWarning(
          issue.code,
          issue.message,
          "Run npm run plan:status, then repair or replace the malformed active plan before continuing."
        )
      ),
    };
  }

  const { state } = validation;

  if (state.executionScopeStatus !== "ACTIVE") {
    return { reason: "inactive_plan", warnings: [] };
  }

  const warnings = [];

  if (state.branch !== gitState.branch) {
    warnings.push(
      createWarning(
        "PLAN_BRANCH_MISMATCH_ADVISORY",
        `Active plan is bound to "${state.branch}", but Git is on "${gitState.branch}".`,
        "Return to the plan branch, or run npm run plan:status before deciding whether this plan should be repaired or closed."
      )
    );
  }

  if (lastRecordedCommitReachable === false) {
    warnings.push(
      createWarning(
        "PLAN_LAST_RECORDED_COMMIT_UNREACHABLE",
        `Plan lastRecordedCommit "${state.lastRecordedCommit}" is not reachable from current HEAD.`,
        "Run npm run plan:status and inspect recent branch/rewrite activity before committing more plan-managed work."
      )
    );
  }

  return {
    reason: warnings.length === 0 ? "safe_return" : "active_plan_drift",
    warnings,
  };
};

const printWarnings = (warnings) => {
  if (warnings.length === 0) {
    return;
  }

  console.error("Plan branch advisory:");
  for (const warning of warnings) {
    console.error(`- ${warning.code}: ${warning.message}`);
    console.error(`  Recovery: ${warning.recovery}`);
  }
};

const main = () => {
  const cwd = process.cwd();
  const planPath = resolve(cwd, TODO_PLAN_PATH);

  if (!existsSync(planPath)) {
    return;
  }

  const markdown = readFileSync(planPath, "utf8");
  const structuralValidation = validatePlanMarkdown(markdown);
  const state = structuralValidation.state;
  const result = evaluateBranchAdvisory({
    gitState: getGitState(cwd),
    lastRecordedCommitReachable: state
      ? getReachability({ cwd, lastRecordedCommit: state.lastRecordedCommit })
      : null,
    markdown,
  });

  printWarnings(result.warnings);
};

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
