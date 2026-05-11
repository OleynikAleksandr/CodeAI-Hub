import assert from "node:assert/strict";
import test from "node:test";
import { injectApplicationSkeletonTaskPair } from "./managed-application-skeleton-plan-mutator";

const REVIEW_REVISION_TASK_RE =
  /\[IN_PROGRESS\] `application-skeleton\.phase2\.review\.revision1\.task1`/u;
const REVIEW_REVISION_COMMIT_RE =
  /Git Commit: `docs: revise application skeleton review revision 1`/u;
const REVIEW_ANCHOR_CLOSED_RE =
  /\[DONE\] `application-skeleton\.phase2\.review\.task1`/u;
const REVIEW_ANCHOR_NO_REVISION_COMMIT_RE =
  /\[DONE\] Git Commit: `docs: revise application skeleton review revision 1` \(hash: not-created-user-accepted-without-review-revision\)/u;
const STALE_REVIEW_ANCHOR_RE =
  /\[IN_PROGRESS\] `application-skeleton\.phase2\.review\.task1`/u;
const MATERIALIZE_TASK_RE = /application-skeleton\.phase3\.materialize\.task1/u;
const PRODUCT_PARTS_SCOPE_RE = /product-parts\/\*\*/u;
const BLOCKED_MATERIALIZE_TASK_RE =
  /\[BLOCKED\] `application-skeleton\.phase3\.materialize\.task1`/u;
const CORE_REJECTED_HASH_RE = /hash: not-created-core-rejected/u;
const APPLICATION_SKELETON_MAP_RE = /application-skeleton-map\.json/u;
const APPLICATION_SKELETON_REVISIONS_RE =
  /workflow\/revisions\/application-skeleton/u;

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

const createPlanText = (taskId = "application-skeleton.phase2.review.task1") =>
  `# Managed Workspace TODO Plan

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "managed-workspace-application-skeleton",
  "branch": "main",
  "baseHead": "TBD",
  "lastRecordedCommit": "TBD",
  "planningSource": ".codeai-hub/workflow/index.json",
  "currentTaskId": "${taskId}",
  "expectedCommitMessage": "docs: revise application skeleton review revision 1",
  "debt": null
}
\`\`\`
<!-- codeai-plan-state:end -->

## Phase 2 - Application Skeleton Contract Review

### Stream: User-Led Review

1. [IN_PROGRESS] \`${taskId}\` Current Application Skeleton task. (scope: \`.codeai-hub/**/application_skeleton/**\`; expected commit: \`docs: revise application skeleton review revision 1\`).
2. [TODO] Git Commit: \`docs: revise application skeleton review revision 1\` (hash: TBD)
`;

test("injects review revision task pair and advances plan state", () => {
  const result = injectApplicationSkeletonTaskPair({
    kind: "review_revision",
    planText: createPlanText(),
  });

  assert.ok(result);
  assert.equal(
    result.nextCurrentTaskId,
    "application-skeleton.phase2.review.revision1.task1"
  );
  assert.equal(
    result.nextCommitMessage,
    "docs: revise application skeleton review revision 1"
  );
  assert.match(result.nextPlanText, REVIEW_REVISION_TASK_RE);
  assert.match(result.nextPlanText, REVIEW_REVISION_COMMIT_RE);
  assertImmediateCommitPair(
    result.nextPlanText,
    result.nextCurrentTaskId,
    result.nextCommitMessage
  );
});

test("injects explicit acceptance before materialization", () => {
  const result = injectApplicationSkeletonTaskPair({
    kind: "acceptance",
    planText: createPlanText(),
  });

  assert.ok(result);
  assert.equal(
    result.nextCurrentTaskId,
    "application-skeleton.phase2.acceptance.task1"
  );
  assert.equal(
    result.nextCommitMessage,
    "docs: accept application skeleton contract"
  );
  assert.doesNotMatch(result.nextPlanText, MATERIALIZE_TASK_RE);
  assert.doesNotMatch(result.nextPlanText, STALE_REVIEW_ANCHOR_RE);
  assert.match(result.nextPlanText, REVIEW_ANCHOR_CLOSED_RE);
  assert.match(result.nextPlanText, REVIEW_ANCHOR_NO_REVISION_COMMIT_RE);
  assertImmediateCommitPair(
    result.nextPlanText,
    result.nextCurrentTaskId,
    result.nextCommitMessage
  );
});

test("injects materialization task pair only when requested", () => {
  const result = injectApplicationSkeletonTaskPair({
    kind: "materialization",
    planText: createPlanText("application-skeleton.phase2.acceptance.task1"),
  });

  assert.ok(result);
  assert.equal(
    result.nextCurrentTaskId,
    "application-skeleton.phase3.materialize.task1"
  );
  assert.equal(
    result.nextCommitMessage,
    "feat: materialize application skeleton"
  );
  assert.match(result.nextPlanText, PRODUCT_PARTS_SCOPE_RE);
  assertImmediateCommitPair(
    result.nextPlanText,
    result.nextCurrentTaskId,
    result.nextCommitMessage
  );
});

test("injects repair task pair and blocks rejected current task", () => {
  const result = injectApplicationSkeletonTaskPair({
    diagnostics: ["application-skeleton-map.json is not parseable"],
    kind: "repair",
    planText: createPlanText("application-skeleton.phase3.materialize.task1"),
    targetPhase: "phase3.materialize",
  });

  assert.ok(result);
  assert.equal(
    result.nextCurrentTaskId,
    "application-skeleton.phase3.materialize.repair1.task1"
  );
  assert.equal(
    result.nextCommitMessage,
    "docs: repair application skeleton phase3.materialize attempt 1"
  );
  assert.match(result.nextPlanText, BLOCKED_MATERIALIZE_TASK_RE);
  assert.match(result.nextPlanText, CORE_REJECTED_HASH_RE);
  assert.match(result.nextPlanText, APPLICATION_SKELETON_MAP_RE);
  assertImmediateCommitPair(
    result.nextPlanText,
    result.nextCurrentTaskId,
    result.nextCommitMessage
  );
});

test("injects post-completion user-return revision task pairs", () => {
  const result = injectApplicationSkeletonTaskPair({
    kind: "user_return_revision",
    planText: createPlanText("application-skeleton.phase4.user-return.task1"),
  });

  assert.ok(result);
  assert.equal(
    result.nextCurrentTaskId,
    "application-skeleton.phase4.user-return.revision1.task1"
  );
  assert.equal(
    result.nextCommitMessage,
    "docs: revise application skeleton user return revision 1"
  );
  assert.match(result.nextPlanText, APPLICATION_SKELETON_REVISIONS_RE);
  assertImmediateCommitPair(
    result.nextPlanText,
    result.nextCurrentTaskId,
    result.nextCommitMessage
  );
});
