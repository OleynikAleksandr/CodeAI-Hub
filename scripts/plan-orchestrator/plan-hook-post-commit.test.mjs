import assert from "node:assert/strict";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { writePlanDebtFile } from "./plan-debt.mjs";
import { finalizePostCommit } from "./plan-hook-post-commit.mjs";
import { parsePlanStateMarkdown } from "./plan-state-parser.mjs";
import { beginPlanTransaction } from "./plan-transaction.mjs";

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
  "currentTaskId": "phase2.stream5.task3",
  "expectedCommitMessage": "feat: finalize plan state after commit",
  "debt": null
}
\`\`\`
<!-- codeai-plan-state:end -->

1. [IN_PROGRESS] \`phase2.stream5.task3\` Add post-commit hook.
   - expected commit: \`feat: finalize plan state after commit\`
2. [TODO] \`phase2.stream5.commit3\` Git Commit: \`feat: finalize plan state after commit\` (hash: TBD)
3. [TODO] \`phase2.stream5.task5\` Add repair command.
   - expected commit: \`feat: add plan repair command\`
4. [TODO] \`phase2.stream5.commit5\` Git Commit: \`feat: add plan repair command\` (hash: TBD)
`;

test("finalizes post-commit transaction and removes debt file", () => {
  const debtPath = join(mkdtempSync(join(tmpdir(), "plan-post-")), "debt.json");
  const pending = beginPlanTransaction({
    debtPath,
    expectedCommitMessage: "feat: finalize plan state after commit",
    markdown: createMarkdown(),
    preCommitHead: "b69985596",
    taskId: "phase2.stream5.task3",
  });
  writePlanDebtFile(debtPath, pending.debt);

  const result = finalizePostCommit({
    debt: pending.debt,
    debtPath,
    markdown: pending.markdown,
  });
  const parsed = parsePlanStateMarkdown(result.markdown);

  assert.equal(result.reason, "cleared_local_debt");
  assert.equal(parsed.state.lastRecordedCommit, "self");
  assert.equal(parsed.state.currentTaskId, "phase2.stream5.task5");
  assert.equal(existsSync(debtPath), false);
});
