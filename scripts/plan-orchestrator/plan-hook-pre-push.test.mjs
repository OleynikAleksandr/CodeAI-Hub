import assert from "node:assert/strict";
import test from "node:test";
import { evaluatePrePushGuard } from "./plan-hook-pre-push.mjs";

const createMarkdown = ({
  branch = "main",
  currentTaskId = "phase1.stream5.task1",
  currentTaskStatus = "IN_PROGRESS",
  debt = null,
  executionScopeStatus = "ACTIVE",
  expectedCommitMessage = "feat: add plan pre-push guard",
} = {}) => `# Development TODO Plan

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "${executionScopeStatus}",
  "planId": "plan-orchestrator-deferred-verification-2026-05-04",
  "branch": "${branch}",
  "baseHead": "016d07741",
  "lastRecordedCommit": "a7ec6bf41",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Plan_Orchestrator_Deferred_Verification_Architecture.md",
  "currentTaskId": ${currentTaskId === null ? "null" : `"${currentTaskId}"`},
  "expectedCommitMessage": ${expectedCommitMessage === null ? "null" : `"${expectedCommitMessage}"`},
  "debt": ${debt === null ? "null" : JSON.stringify(debt)}
}
\`\`\`
<!-- codeai-plan-state:end -->

1. [${currentTaskStatus}] \`phase1.stream5.task1\` Add pre-push plan guard tests and minimal guard entry point.
   - expected commit: \`feat: add plan pre-push guard\`
2. [TODO] \`phase1.stream5.commit1\` Git Commit: \`feat: add plan pre-push guard\` (hash: TBD)
`;

const cleanGitState = {
  branch: "main",
  debtExists: false,
  head: "a7ec6bf41",
};

test("allows push when active plan is valid, branch matches, and debt is absent", () => {
  const result = evaluatePrePushGuard({
    gitState: cleanGitState,
    markdown: createMarkdown(),
  });

  assert.equal(result.ok, true);
  assert.equal(result.reason, "active_plan_valid");
});

test("blocks push when plan debt exists", () => {
  const result = evaluatePrePushGuard({
    gitState: { ...cleanGitState, debtExists: true },
    markdown: createMarkdown(),
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "active_plan_invalid");
  assert.equal(result.issues[0].code, "PLAN_DEBT_EXISTS");
});

test("blocks push when active plan validation fails", () => {
  const result = evaluatePrePushGuard({
    gitState: cleanGitState,
    markdown: createMarkdown({ currentTaskStatus: "TODO" }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "active_plan_invalid");
  assert.equal(result.issues[0].code, "PLAN_CURRENT_TASK_STATUS_INVALID");
});

test("blocks push when plan branch differs from Git branch", () => {
  const result = evaluatePrePushGuard({
    gitState: cleanGitState,
    markdown: createMarkdown({ branch: "codex/other" }),
  });

  assert.equal(result.ok, false);
  assert.equal(result.reason, "active_plan_invalid");
  assert.equal(result.issues[0].code, "PLAN_BRANCH_MISMATCH");
});

test("allows push when plan scope status is NONE", () => {
  const result = evaluatePrePushGuard({
    gitState: { ...cleanGitState, branch: "release/check" },
    markdown: createMarkdown({
      currentTaskId: null,
      currentTaskStatus: "DONE",
      executionScopeStatus: "NONE",
      expectedCommitMessage: null,
    }),
  });

  assert.equal(result.ok, true);
  assert.equal(result.reason, "inactive_plan");
});
