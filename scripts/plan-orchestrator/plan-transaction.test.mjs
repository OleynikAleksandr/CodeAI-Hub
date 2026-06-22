import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { parsePlanStateMarkdown } from "./plan-state-parser.mjs";
import {
  beginPlanTransaction,
  finalizePlanTransaction,
} from "./plan-transaction.mjs";

const COMMIT_DONE_WITH_SELF_HASH_PATTERN =
  /\[DONE\].*Git Commit.*\(hash: self\)/u;
const NEXT_TASK_IN_PROGRESS_PATTERN = /\[IN_PROGRESS\].*Add pre-commit guard/u;

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
  "currentTaskId": "phase2.stream3.task3",
  "expectedCommitMessage": "feat: add plan transaction debt state",
  "debt": null
}
\`\`\`
<!-- codeai-plan-state:end -->

## Phase 2 - Commit Transaction

1. [IN_PROGRESS] \`phase2.stream3.task3\` Add debt primitives.
   - scope: \`scripts/plan-orchestrator/*\`
   - expected commit: \`feat: add plan transaction debt state\`
2. [TODO] \`phase2.stream3.commit3\` Git Commit: \`feat: add plan transaction debt state\` (hash: TBD)
3. [TODO] \`phase2.stream4.task1\` Add pre-commit guard.
   - scope: \`scripts/plan-orchestrator/*\`
   - expected commit: \`feat: enforce plan state before commit\`
4. [TODO] \`phase2.stream4.commit1\` Git Commit: \`feat: enforce plan state before commit\` (hash: TBD)
`;

test("writes local debt and advances markdown for the commit itself", () => {
  const debtPath = join(mkdtempSync(join(tmpdir(), "plan-debt-")), "debt.json");
  const result = beginPlanTransaction({
    debtPath,
    expectedCommitMessage: "feat: add plan transaction debt state",
    markdown: createMarkdown(),
    preCommitHead: "353c769ee",
    taskId: "phase2.stream3.task3",
  });
  const parsed = parsePlanStateMarkdown(result.markdown);
  const fileDebt = JSON.parse(readFileSync(debtPath, "utf8"));

  assert.deepEqual(fileDebt, result.debt);
  assert.equal(fileDebt.rollbackMarkdown, createMarkdown());
  assert.equal(parsed.state.debt, null);
  assert.equal(parsed.state.lastRecordedCommit, "self");
  assert.equal(parsed.state.currentTaskId, "phase2.stream4.task1");
  assert.match(result.markdown, COMMIT_DONE_WITH_SELF_HASH_PATTERN);
  assert.match(result.markdown, NEXT_TASK_IN_PROGRESS_PATTERN);
});

test("finalizes transaction and clears debt file", () => {
  const debtPath = join(mkdtempSync(join(tmpdir(), "plan-debt-")), "debt.json");
  const pending = beginPlanTransaction({
    debtPath,
    expectedCommitMessage: "feat: add plan transaction debt state",
    markdown: createMarkdown(),
    preCommitHead: "353c769ee",
    taskId: "phase2.stream3.task3",
  });

  const markdown = finalizePlanTransaction({
    commitHash: "abc1234",
    debtPath,
    markdown: pending.markdown,
    taskId: "phase2.stream3.task3",
  });
  const parsed = parsePlanStateMarkdown(markdown);

  assert.equal(parsed.state.debt, null);
  assert.equal(parsed.state.lastRecordedCommit, "self");
  assert.equal(parsed.state.currentTaskId, "phase2.stream4.task1");
  assert.equal(
    parsed.state.expectedCommitMessage,
    "feat: enforce plan state before commit"
  );
  assert.match(markdown, COMMIT_DONE_WITH_SELF_HASH_PATTERN);
});
