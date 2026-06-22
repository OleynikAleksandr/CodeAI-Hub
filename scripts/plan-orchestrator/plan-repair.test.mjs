import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { writePlanDebtFile } from "./plan-debt.mjs";
import { repairPlanMarkdown } from "./plan-repair.mjs";
import { parsePlanStateMarkdown } from "./plan-state-parser.mjs";
import { beginPlanTransaction } from "./plan-transaction.mjs";

const REPAIR_TASK_IN_PROGRESS_PATTERN = /\[IN_PROGRESS\].*Add repair command/u;
const REPAIR_COMMIT_TODO_PATTERN = /\[TODO\].*Git Commit/u;

const createMarkdown = () => `# План разработки

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
  "currentTaskId": "phase2.stream5.task5",
  "expectedCommitMessage": "feat: add plan repair command",
  "debt": null
}
\`\`\`
<!-- codeai-plan-state:end -->

1. [IN_PROGRESS] \`phase2.stream5.task5\` Add repair command.
   - expected commit: \`feat: add plan repair command\`
2. [TODO] \`phase2.stream5.commit5\` Git Commit: \`feat: add plan repair command\` (hash: TBD)
3. [TODO] \`phase3.stream6.task1\` Update AGENTS.
   - expected commit: \`docs: document plan-first session recovery\`
4. [TODO] \`phase3.stream6.commit1\` Git Commit: \`docs: document plan-first session recovery\` (hash: TBD)
`;

test("repairs commit-succeeded hash-missing debt", () => {
  const debtPath = join(
    mkdtempSync(join(tmpdir(), "plan-repair-")),
    "debt.json"
  );
  const pending = beginPlanTransaction({
    debtPath,
    expectedCommitMessage: "feat: add plan repair command",
    markdown: createMarkdown(),
    preCommitHead: "ef3c34928",
    taskId: "phase2.stream5.task5",
  });
  writePlanDebtFile(debtPath, pending.debt);

  const result = repairPlanMarkdown({
    debt: { ...pending.debt, debtPath },
    head: "abc1234",
    markdown: pending.markdown,
    subject: "feat: add plan repair command",
  });
  const parsed = parsePlanStateMarkdown(result.markdown);

  assert.equal(result.reason, "commit_succeeded_local_debt_cleared");
  assert.equal(parsed.state.lastRecordedCommit, "self");
  assert.equal(parsed.state.currentTaskId, "phase3.stream6.task1");
});

test("marks plan blocked when repair cannot prove a safe transition", () => {
  const result = repairPlanMarkdown({
    debt: {
      debtPath: "/tmp/codeai-plan-debt",
      expectedCommitMessage: "feat: add plan repair command",
      preCommitHead: "ef3c34928",
      stage: "commit_pending",
      taskId: "phase2.stream5.task5",
    },
    head: "ef3c34928",
    markdown: createMarkdown(),
    subject: "docs: unrelated",
  });
  const parsed = parsePlanStateMarkdown(result.markdown);

  assert.equal(result.reason, "unsafe_blocked");
  assert.equal(parsed.state.executionScopeStatus, "BLOCKED");
});

test("rolls back pending transaction when commit was not created", () => {
  const debtPath = join(
    mkdtempSync(join(tmpdir(), "plan-repair-")),
    "debt.json"
  );
  const pending = beginPlanTransaction({
    debtPath,
    expectedCommitMessage: "feat: add plan repair command",
    markdown: createMarkdown(),
    preCommitHead: "ef3c34928",
    taskId: "phase2.stream5.task5",
  });

  const result = repairPlanMarkdown({
    debt: { ...pending.debt, debtPath },
    head: "ef3c34928",
    markdown: pending.markdown,
    subject: "docs: unrelated",
  });
  const parsed = parsePlanStateMarkdown(result.markdown);

  assert.equal(result.reason, "commit_not_created_rolled_back");
  assert.equal(parsed.state.debt, null);
  assert.equal(parsed.state.executionScopeStatus, "ACTIVE");
  assert.equal(parsed.state.currentTaskId, "phase2.stream5.task5");
  assert.equal(parsed.state.lastRecordedCommit, "0debb4a32");
  assert.match(result.markdown, REPAIR_TASK_IN_PROGRESS_PATTERN);
  assert.match(result.markdown, REPAIR_COMMIT_TODO_PATTERN);
});
