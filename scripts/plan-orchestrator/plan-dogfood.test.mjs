import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { evaluateCommitMessageGuard } from "./plan-hook-commit-msg.mjs";
import { finalizePostCommit } from "./plan-hook-post-commit.mjs";
import { evaluatePreCommitGuard } from "./plan-hook-pre-commit.mjs";
import { repairPlanMarkdown } from "./plan-repair.mjs";
import { parsePlanStateMarkdown } from "./plan-state-parser.mjs";
import { beginPlanTransaction } from "./plan-transaction.mjs";

const TRANSACTION_ENV = { CODEAI_PLAN_TRANSACTION_ACTIVE: "1" };

const createMarkdown = () => `# План разработки

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "plan-orchestrator-2026-05-03",
  "branch": "main",
  "baseHead": "51174a134",
  "lastRecordedCommit": "51174a134",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Plan_Orchestrator_Architecture.md",
  "currentTaskId": "phase4.stream7.task2",
  "expectedCommitMessage": "test: dogfood plan orchestrator commit hooks",
  "debt": null
}
\`\`\`
<!-- codeai-plan-state:end -->

## Phase 4 - Tooling Verification

1. [IN_PROGRESS] \`phase4.stream7.task2\` Run controlled dogfood scenario.
   - expected commit: \`test: dogfood plan orchestrator commit hooks\`
2. [TODO] \`phase4.stream7.commit2\` Git Commit: \`test: dogfood plan orchestrator commit hooks\` (hash: TBD)
3. [TODO] \`phase4.stream8.task1\` User checks Plan Orchestrator recovery.
   - expected commit: \`docs: record plan orchestrator workflow acceptance\`
4. [TODO] \`phase4.stream8.commit1\` Git Commit: \`docs: record plan orchestrator workflow acceptance\` (hash: TBD)
`;

const gitState = {
  branch: "main",
  debtExists: false,
  head: "51174a134",
};

test("dogfoods active plan commit guards, finalize, and repair path", () => {
  const directPreCommit = evaluatePreCommitGuard({
    env: {},
    gitState,
    markdown: createMarkdown(),
  });

  assert.equal(directPreCommit.ok, false);
  assert.equal(directPreCommit.reason, "direct_commit_blocked");
  assert.equal(directPreCommit.issues[0].code, "PLAN_DIRECT_COMMIT_BLOCKED");

  const debtPath = join(
    mkdtempSync(join(tmpdir(), "plan-dogfood-")),
    "debt.json"
  );
  const pending = beginPlanTransaction({
    debtPath,
    expectedCommitMessage: "test: dogfood plan orchestrator commit hooks",
    markdown: createMarkdown(),
    preCommitHead: "51174a134",
    taskId: "phase4.stream7.task2",
  });

  const transactionPreCommit = evaluatePreCommitGuard({
    env: TRANSACTION_ENV,
    gitState: { ...gitState, debtExists: true },
    markdown: pending.markdown,
    transactionDebt: pending.debt,
  });
  const transactionCommitMessage = evaluateCommitMessageGuard({
    env: TRANSACTION_ENV,
    gitState: { ...gitState, debtExists: true },
    markdown: pending.markdown,
    message: "test: dogfood plan orchestrator commit hooks\n",
    transactionDebt: pending.debt,
  });

  assert.equal(transactionPreCommit.ok, true);
  assert.equal(transactionPreCommit.reason, "transaction_commit");
  assert.equal(transactionCommitMessage.ok, true);
  assert.equal(transactionCommitMessage.reason, "transaction_commit_message");

  const finalized = finalizePostCommit({
    debt: pending.debt,
    debtPath,
    markdown: pending.markdown,
  });
  const finalizedState = parsePlanStateMarkdown(finalized.markdown).state;

  assert.equal(finalized.reason, "cleared_local_debt");
  assert.equal(finalizedState.debt, null);
  assert.equal(finalizedState.lastRecordedCommit, "self");
  assert.equal(finalizedState.currentTaskId, "phase4.stream8.task1");

  const repaired = repairPlanMarkdown({
    debt: { ...pending.debt, debtPath },
    head: "def5678",
    markdown: pending.markdown,
    subject: "test: dogfood plan orchestrator commit hooks",
  });
  const repairedState = parsePlanStateMarkdown(repaired.markdown).state;

  assert.equal(repaired.reason, "commit_succeeded_local_debt_cleared");
  assert.equal(repairedState.debt, null);
  assert.equal(repairedState.lastRecordedCommit, "self");
  assert.equal(repairedState.currentTaskId, "phase4.stream8.task1");

  const rolledBack = repairPlanMarkdown({
    debt: { ...pending.debt, debtPath },
    head: "51174a134",
    markdown: pending.markdown,
    subject: "docs: document plan-first session recovery",
  });
  const rolledBackState = parsePlanStateMarkdown(rolledBack.markdown).state;

  assert.equal(rolledBack.reason, "commit_not_created_rolled_back");
  assert.equal(rolledBackState.debt, null);
  assert.equal(rolledBackState.currentTaskId, "phase4.stream7.task2");
});
