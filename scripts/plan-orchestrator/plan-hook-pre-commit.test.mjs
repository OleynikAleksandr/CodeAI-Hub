import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePreCommitGuard } from "./plan-hook-pre-commit.mjs";

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
  "currentTaskId": "phase2.stream4.task1",
  "expectedCommitMessage": "feat: enforce plan state before commit",
  "debt": null
}
\`\`\`
<!-- codeai-plan-state:end -->

1. [IN_PROGRESS] \`phase2.stream4.task1\` Add pre-commit guard.
   - expected commit: \`feat: enforce plan state before commit\`
2. [TODO] \`phase2.stream4.commit1\` Git Commit: \`feat: enforce plan state before commit\` (hash: TBD)
`;

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
    markdown: createMarkdown(),
  });

  assert.equal(result.ok, true);
  assert.equal(result.reason, "transaction_commit");
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
