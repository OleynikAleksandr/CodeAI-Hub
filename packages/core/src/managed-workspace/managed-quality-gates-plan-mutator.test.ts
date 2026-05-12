import assert from "node:assert/strict";
import test from "node:test";
import { injectQualityGatesTaskPair } from "./managed-quality-gates-plan-mutator";

const REVIEW_REVISION_TASK_RE =
  /\[IN_PROGRESS\] `quality-gates\.phase2\.review\.revision1\.task1`/u;
const REVIEW_REVISION_COMMIT_RE =
  /Git Commit: `docs: revise quality gates contract - revision 1`/u;
const REVIEW_ANCHOR_CLOSED_RE =
  /\[DONE\] `quality-gates\.phase2\.review\.task1`/u;
const REVIEW_ANCHOR_NO_REVISION_COMMIT_RE =
  /\[DONE\] Git Commit: `docs: revise quality gates contract - revision 1` \(hash: not-created-user-accepted-without-review-revision\)/u;
const STALE_REVIEW_ANCHOR_RE =
  /\[IN_PROGRESS\] `quality-gates\.phase2\.review\.task1`/u;
const INTEGRATION_TASK_RE = /quality-gates\.phase3\.integration\.task1/u;
const INTEGRATION_SCOPE_RE = /package\.json/u;
const HUSKY_SCOPE_RE = /\.husky\/\*\*/u;
const BLOCKED_INTEGRATION_TASK_RE =
  /\[BLOCKED\] `quality-gates\.phase3\.integration\.task1`/u;
const CORE_REJECTED_HASH_RE = /hash: not-created-core-rejected/u;
const ATTEMPTS_SCOPE_RE = /workflow\/revisions\/quality-gates\/attempts/u;
const USER_RETURN_SCOPE_RE = /workflow\/revisions\/quality-gates/u;

const escapeRegExp = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");

const assertImmediateCommitPair = (
  planText: string,
  taskId: string,
  message: string
): void => {
  const lines = planText.split("\n");
  const taskLineIndex = lines.findIndex((line) =>
    line.includes(`\`${taskId}\``)
  );
  assert.notEqual(taskLineIndex, -1, `Missing task ${taskId}`);
  assert.match(
    lines[taskLineIndex + 1] ?? "",
    new RegExp(`Git Commit: \`${escapeRegExp(message)}\``, "u")
  );
};

const createPlanText = (taskId = "quality-gates.phase2.review.task1") =>
  `# Managed Workspace TODO Plan

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-workspace-quality-gates",
  "branch": "main",
  "baseHead": "TBD",
  "lastRecordedCommit": "TBD",
  "planningSource": ".codeai-hub/workflow/index.json",
  "currentTaskId": "${taskId}",
  "expectedCommitMessage": "docs: revise quality gates contract - revision 1",
  "debt": null
}
\`\`\`
<!-- codeai-plan-state:end -->

## Phase 2 - Quality Gates Contract Review

### Stream: User-Led Review

1. [IN_PROGRESS] \`${taskId}\` Current Quality Gates task. (scope: \`.codeai-hub/**/quality_gates/**\`; expected commit: \`docs: revise quality gates contract - revision 1\`).
2. [TODO] Git Commit: \`docs: revise quality gates contract - revision 1\` (hash: TBD)
`;

test("injects review revision task pair and advances plan state", () => {
  const result = injectQualityGatesTaskPair({
    kind: "review_revision",
    planText: createPlanText(),
  });

  assert.ok(result);
  assert.equal(
    result.nextCurrentTaskId,
    "quality-gates.phase2.review.revision1.task1"
  );
  assert.equal(
    result.nextCommitMessage,
    "docs: revise quality gates contract - revision 1"
  );
  assert.match(result.nextPlanText, REVIEW_REVISION_TASK_RE);
  assert.match(result.nextPlanText, REVIEW_REVISION_COMMIT_RE);
  assertImmediateCommitPair(
    result.nextPlanText,
    result.nextCurrentTaskId,
    result.nextCommitMessage
  );
});

test("injects explicit acceptance before integration", () => {
  const result = injectQualityGatesTaskPair({
    kind: "acceptance",
    planText: createPlanText(),
  });

  assert.ok(result);
  assert.equal(
    result.nextCurrentTaskId,
    "quality-gates.phase2.acceptance.task1"
  );
  assert.equal(result.nextCommitMessage, "docs: accept quality gates contract");
  assert.doesNotMatch(result.nextPlanText, INTEGRATION_TASK_RE);
  assert.doesNotMatch(result.nextPlanText, STALE_REVIEW_ANCHOR_RE);
  assert.match(result.nextPlanText, REVIEW_ANCHOR_CLOSED_RE);
  assert.match(result.nextPlanText, REVIEW_ANCHOR_NO_REVISION_COMMIT_RE);
  assertImmediateCommitPair(
    result.nextPlanText,
    result.nextCurrentTaskId,
    result.nextCommitMessage
  );
});

test("injects integration task pair only when requested", () => {
  const result = injectQualityGatesTaskPair({
    kind: "integration",
    planText: createPlanText("quality-gates.phase2.acceptance.task1"),
  });

  assert.ok(result);
  assert.equal(
    result.nextCurrentTaskId,
    "quality-gates.phase3.integration.task1"
  );
  assert.equal(
    result.nextCommitMessage,
    "feat: integrate quality gates baseline"
  );
  assert.match(result.nextPlanText, INTEGRATION_SCOPE_RE);
  assert.match(result.nextPlanText, HUSKY_SCOPE_RE);
  assertImmediateCommitPair(
    result.nextPlanText,
    result.nextCurrentTaskId,
    result.nextCommitMessage
  );
});

test("injects repair task pair and blocks rejected current task", () => {
  const result = injectQualityGatesTaskPair({
    diagnostics: ["quality-gates.json is not parseable"],
    kind: "repair",
    planText: createPlanText("quality-gates.phase3.integration.task1"),
    targetPhase: "phase3.integration",
  });

  assert.ok(result);
  assert.equal(
    result.nextCurrentTaskId,
    "quality-gates.phase3.integration.repair1.task1"
  );
  assert.equal(
    result.nextCommitMessage,
    "docs: repair quality gates phase3.integration attempt 1"
  );
  assert.match(result.nextPlanText, BLOCKED_INTEGRATION_TASK_RE);
  assert.match(result.nextPlanText, CORE_REJECTED_HASH_RE);
  assert.match(result.nextPlanText, ATTEMPTS_SCOPE_RE);
  assertImmediateCommitPair(
    result.nextPlanText,
    result.nextCurrentTaskId,
    result.nextCommitMessage
  );
});

test("injects sequential repair task pairs and increments attempt number", () => {
  const first = injectQualityGatesTaskPair({
    diagnostics: ["quality-gates.json is not parseable"],
    kind: "repair",
    planText: createPlanText("quality-gates.phase3.integration.task1"),
    targetPhase: "phase3.integration",
  });
  assert.ok(first);
  const second = injectQualityGatesTaskPair({
    diagnostics: ["second attempt still missing schema"],
    kind: "repair",
    planText: first.nextPlanText,
    targetPhase: "phase3.integration",
  });
  assert.ok(second);
  assert.equal(
    second.nextCurrentTaskId,
    "quality-gates.phase3.integration.repair2.task1"
  );
  assert.equal(
    second.nextCommitMessage,
    "docs: repair quality gates phase3.integration attempt 2"
  );
});

test("injects post-completion user-return revision task pairs", () => {
  const result = injectQualityGatesTaskPair({
    kind: "user_return_revision",
    planText: createPlanText("quality-gates.phase4.user-return.task1"),
  });

  assert.ok(result);
  assert.equal(
    result.nextCurrentTaskId,
    "quality-gates.phase4.user-return.revision1.task1"
  );
  assert.equal(
    result.nextCommitMessage,
    "docs: revise quality gates user return revision 1"
  );
  assert.match(result.nextPlanText, USER_RETURN_SCOPE_RE);
  assertImmediateCommitPair(
    result.nextPlanText,
    result.nextCurrentTaskId,
    result.nextCommitMessage
  );
});
