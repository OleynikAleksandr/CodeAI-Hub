import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getRepositoryDebtPath, readPlanDebtFile } from "./plan-debt.mjs";
import { getGitState } from "./plan-git-state.mjs";
import { finalizePlanTransaction } from "./plan-transaction.mjs";

const TODO_PLAN_PATH = "doc/TODO/todo-plan.md";
const TRANSACTION_ENV = "CODEAI_PLAN_TRANSACTION_ACTIVE";

export const finalizePostCommit = ({
  commitHash,
  debt,
  debtPath,
  markdown,
}) => {
  if (!debt) {
    return {
      markdown,
      ok: true,
      reason: "no_debt",
    };
  }

  return {
    markdown: finalizePlanTransaction({
      commitHash,
      debtPath,
      markdown,
      taskId: debt.taskId,
    }),
    ok: true,
    reason: "finalized",
  };
};

const main = () => {
  if (process.env[TRANSACTION_ENV] !== "1") {
    return;
  }

  const cwd = process.cwd();
  const planPath = resolve(cwd, TODO_PLAN_PATH);
  const debtPath = getRepositoryDebtPath(cwd);
  const result = finalizePostCommit({
    commitHash: getGitState(cwd).head,
    debt: readPlanDebtFile(debtPath),
    debtPath,
    markdown: readFileSync(planPath, "utf8"),
  });

  writeFileSync(planPath, result.markdown, "utf8");
  console.log(`Plan post-commit hook: ${result.reason}`);
};

if (fileURLToPath(import.meta.url) === process.argv[1]) {
  main();
}
