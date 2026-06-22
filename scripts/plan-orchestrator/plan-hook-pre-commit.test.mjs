import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePreCommitGuard } from "./plan-hook-pre-commit.mjs";

const createMarkdown = ({
  commitStatus = "TODO",
  debt = null,
  expectedCommitMessage = "feat: enforce plan state before commit",
  hash = "TBD",
  nextTaskStatus = "TODO",
  currentTaskId = "phase2.stream4.task1",
  taskStatus = "IN_PROGRESS",
} = {}) => `# План разработки

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "plan-orchestrator-2026-05-03",
  "branch": "main",
  "baseHead": "0debb4a32",
  "lastRecordedCommit": "0debb4a32",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Plan_Orchestrator_Architecture.md",
  "currentTaskId": "${currentTaskId}",
  "expectedCommitMessage": "${expectedCommitMessage}",
  "debt": ${debt === null ? "null" : JSON.stringify(debt)}
}
\`\`\`
<!-- codeai-plan-state:end -->

1. [${taskStatus}] \`phase2.stream4.task1\` Add pre-commit guard.
   - scope: \`scripts/plan-orchestrator/**, doc/TODO/todo-plan.md\`
   - expected commit: \`feat: enforce plan state before commit\`
2. [${commitStatus}] \`phase2.stream4.commit1\` Git Commit: \`feat: enforce plan state before commit\` (hash: ${hash})
3. [${nextTaskStatus}] \`phase2.stream5.task1\` Next docs task.
   - scope: \`docs/**, doc/TODO/todo-plan.md\`
   - expected commit: \`docs: next\`
4. [TODO] \`phase2.stream5.commit1\` Git Commit: \`docs: next\` (hash: TBD)
`;

const transactionDebt = {
  expectedCommitMessage: "feat: enforce plan state before commit",
  preCommitHead: "a4be3c37d",
  rollbackMarkdown: createMarkdown(),
  stage: "commit_pending",
  taskId: "phase2.stream4.task1",
};

const createPreparedMarkdown = () =>
  createMarkdown({
    commitStatus: "DONE",
    currentTaskId: "phase2.stream5.task1",
    expectedCommitMessage: "docs: next",
    hash: "self",
    nextTaskStatus: "IN_PROGRESS",
    taskStatus: "DONE",
  });

const gitState = {
  branch: "main",
  debtExists: false,
  head: "a4be3c37d",
};

test("allows legacy plans before machine state migration", () => {
  const result = evaluatePreCommitGuard({
    env: {},
    gitState,
    markdown: "# План разработки",
  });

  assert.equal(result.ok, true);
  assert.equal(result.reason, "legacy_plan_without_machine_state");
});

test("blocks direct commits for active machine-managed plans", () => {
  const result = evaluatePreCommitGuard({
    env: {},
    gitState,
    markdown: createMarkdown(),
  });

  assert.equal(result.ok, false);
  assert.equal(result.issues[0].code, "PLAN_DIRECT_COMMIT_BLOCKED");
});

test("allows active machine-managed plan during transaction", () => {
  const result = evaluatePreCommitGuard({
    env: { CODEAI_PLAN_TRANSACTION_ACTIVE: "1" },
    gitState,
    markdown: createPreparedMarkdown(),
    stagedFiles: [
      "doc/TODO/todo-plan.md",
      "scripts/plan-orchestrator/plan-hook-pre-commit.mjs",
    ],
    transactionDebt,
  });

  assert.equal(result.ok, true);
  assert.equal(result.reason, "transaction_commit");
});

test("blocks staged files outside current task scope during transaction", () => {
  const result = evaluatePreCommitGuard({
    env: { CODEAI_PLAN_TRANSACTION_ACTIVE: "1" },
    gitState,
    markdown: createPreparedMarkdown(),
    stagedFiles: ["doc/TODO/todo-plan.md", "src/client/project-manager/api.ts"],
    transactionDebt,
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "staged_files_outside_scope");
  assert.equal(result.issues[0].code, "PLAN_STAGED_FILES_OUTSIDE_SCOPE");
});

test("blocks open debt outside transaction", () => {
  const result = evaluatePreCommitGuard({
    env: {},
    gitState: { ...gitState, debtExists: true },
    markdown: createMarkdown(),
  });

  assert.equal(result.ok, false);
  assert.equal(result.issues[0].code, "PLAN_DEBT_EXISTS");
});
