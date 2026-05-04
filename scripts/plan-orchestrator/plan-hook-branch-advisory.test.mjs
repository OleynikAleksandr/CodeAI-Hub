import assert from "node:assert/strict";
import test from "node:test";
import { evaluateBranchAdvisory } from "./plan-hook-branch-advisory.mjs";

const createMarkdown = ({
  branch = "main",
  executionScopeStatus = "ACTIVE",
  lastRecordedCommit = "dcc966f3a",
} = {}) => `# Development TODO Plan

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "${executionScopeStatus}",
  "planId": "plan-orchestrator-deferred-verification-2026-05-04",
  "branch": "${branch}",
  "baseHead": "016d07741",
  "lastRecordedCommit": "${lastRecordedCommit}",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Plan_Orchestrator_Deferred_Verification_Architecture.md",
  "currentTaskId": ${executionScopeStatus === "ACTIVE" ? '"phase4.stream1.task1"' : "null"},
  "expectedCommitMessage": ${executionScopeStatus === "ACTIVE" ? '"feat: add plan branch advisory hooks"' : "null"},
  "debt": null
}
\`\`\`
<!-- codeai-plan-state:end -->

1. [IN_PROGRESS] \`phase4.stream1.task1\` Add advisory branch hook tests.
   - expected commit: \`feat: add plan branch advisory hooks\`
2. [TODO] \`phase4.stream1.commit1\` Git Commit: \`feat: add plan branch advisory hooks\` (hash: TBD)
`;

const cleanGitState = {
  branch: "main",
  debtExists: false,
  head: "dcc966f3a",
};

test("returns safe result when active plan branch and recorded commit are valid", () => {
  const result = evaluateBranchAdvisory({
    gitState: cleanGitState,
    lastRecordedCommitReachable: true,
    markdown: createMarkdown(),
  });

  assert.equal(result.reason, "safe_return");
  assert.deepEqual(result.warnings, []);
});

test("warns when active plan branch differs from Git branch", () => {
  const result = evaluateBranchAdvisory({
    gitState: { ...cleanGitState, branch: "codex/other" },
    lastRecordedCommitReachable: true,
    markdown: createMarkdown(),
  });

  assert.equal(result.reason, "active_plan_drift");
  assert.equal(result.warnings[0].code, "PLAN_BRANCH_MISMATCH_ADVISORY");
});

test("warns when lastRecordedCommit is unreachable from current HEAD", () => {
  const result = evaluateBranchAdvisory({
    gitState: cleanGitState,
    lastRecordedCommitReachable: false,
    markdown: createMarkdown({ lastRecordedCommit: "111111111" }),
  });

  assert.equal(result.reason, "active_plan_drift");
  assert.equal(
    result.warnings[0].code,
    "PLAN_LAST_RECORDED_COMMIT_UNREACHABLE"
  );
});

test("allows inactive NONE plans without warnings", () => {
  const result = evaluateBranchAdvisory({
    gitState: { ...cleanGitState, branch: "codex/other" },
    lastRecordedCommitReachable: false,
    markdown: createMarkdown({ executionScopeStatus: "NONE" }),
  });

  assert.equal(result.reason, "inactive_plan");
  assert.deepEqual(result.warnings, []);
});
