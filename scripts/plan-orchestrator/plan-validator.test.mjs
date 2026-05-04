import assert from "node:assert/strict";
import test from "node:test";
import { validatePlanMarkdown } from "./plan-validator.mjs";

const createPlanMarkdown = ({
  branch = "main",
  commitItemMessage = "feat: add plan state validator",
  currentStatus = "IN_PROGRESS",
  debt = null,
  duplicateCurrentTask = false,
  expectedCommitMessage = "feat: add plan state validator",
} = {}) => `# План разработки

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "plan-orchestrator-2026-05-03",
  "branch": "${branch}",
  "baseHead": "0debb4a32",
  "lastRecordedCommit": "0debb4a32",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Plan_Orchestrator_Architecture.md",
  "currentTaskId": "phase1.stream2.task1",
  "expectedCommitMessage": "${expectedCommitMessage}",
  "debt": ${debt === null ? "null" : JSON.stringify(debt)}
}
\`\`\`
<!-- codeai-plan-state:end -->

## Phase 1 - Parser and Validator

1. [${currentStatus}] \`phase1.stream2.task1\` Add validator core.
   - scope: \`scripts/plan-orchestrator/*\`, tests
   - expected commit: \`${expectedCommitMessage}\`
2. [TODO] \`phase1.stream2.commit1\` Git Commit: \`${commitItemMessage}\` (hash: TBD)
${
  duplicateCurrentTask
    ? "3. [TODO] `phase1.stream2.task1` Duplicate task id.\n"
    : ""
}`;

const cleanGitState = {
  branch: "main",
  debtExists: false,
  head: "f654ad055",
};

const createUserCheckPlanMarkdown = () => `# План разработки

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
  "currentTaskId": "phase4.stream8.task1",
  "expectedCommitMessage": null,
  "debt": null
}
\`\`\`
<!-- codeai-plan-state:end -->

1. [IN_PROGRESS] \`phase4.stream8.task1\` User checks recovery behavior.
2. [TODO] \`phase4.stream8.task2\` User checks commit workflow.
3. [TODO] \`phase4.stream8.task3\` User gives acceptance.
   - expected commit: \`docs: record plan orchestrator workflow acceptance\`
4. [TODO] \`phase4.stream8.commit3\` Git Commit: \`docs: record plan orchestrator workflow acceptance\` (hash: TBD)
`;

test("validates current task, paired commit item, branch and debt absence", () => {
  const result = validatePlanMarkdown(createPlanMarkdown(), {
    gitState: cleanGitState,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);
  assert.equal(result.state.currentTaskId, "phase1.stream2.task1");
});

test("validates active user-check task without paired commit", () => {
  const result = validatePlanMarkdown(createUserCheckPlanMarkdown(), {
    gitState: cleanGitState,
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.issues, []);
  assert.equal(result.state.currentTaskId, "phase4.stream8.task1");
  assert.equal(result.state.expectedCommitMessage, null);
});

test("reports missing machine state block as a validation issue", () => {
  const result = validatePlanMarkdown("# План разработки", {
    gitState: cleanGitState,
  });

  assert.equal(result.ok, false);
  assert.equal(result.issues[0].code, "PLAN_STATE_BLOCK_MISSING");
});

test("reports current task status mismatch", () => {
  const result = validatePlanMarkdown(
    createPlanMarkdown({ currentStatus: "TODO" }),
    { gitState: cleanGitState }
  );

  assert.equal(result.ok, false);
  assert.equal(result.issues[0].code, "PLAN_CURRENT_TASK_STATUS_INVALID");
});

test("reports paired Git Commit message mismatch", () => {
  const result = validatePlanMarkdown(
    createPlanMarkdown({ commitItemMessage: "fix: wrong message" }),
    { gitState: cleanGitState }
  );

  assert.equal(result.ok, false);
  assert.equal(result.issues[0].code, "PLAN_PAIRED_COMMIT_MESSAGE_MISMATCH");
});

test("reports duplicate task ids", () => {
  const result = validatePlanMarkdown(
    createPlanMarkdown({ duplicateCurrentTask: true }),
    { gitState: cleanGitState }
  );

  assert.equal(result.ok, false);
  assert.equal(result.issues[0].code, "PLAN_DUPLICATE_TASK_ID");
});

test("reports branch mismatch and open debt", () => {
  const result = validatePlanMarkdown(
    createPlanMarkdown({ branch: "codex/other", debt: { stage: "commit" } }),
    { gitState: cleanGitState }
  );

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.issues.map((issue) => issue.code),
    ["PLAN_BRANCH_MISMATCH", "PLAN_DEBT_EXISTS"]
  );
});
