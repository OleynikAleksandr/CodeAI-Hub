import assert from "node:assert/strict";
import test from "node:test";
import {
  finalizeCommitAndAdvance,
  markTaskDoneAndCommitPending,
} from "./plan-markdown-updater.mjs";
import { parsePlanStateMarkdown } from "./plan-state-parser.mjs";

const TASK_DONE_PATTERN = /1\. \[DONE\] `phase2\.stream3\.task1`/u;
const COMMIT_PENDING_PATTERN = /2\. \[PENDING\] `phase2\.stream3\.commit1`/u;
const COMMIT_DONE_PATTERN = /2\. \[DONE\] `phase2\.stream3\.commit1`/u;
const COMMIT_HASH_PATTERN =
  /Git Commit: `feat: add plan markdown updater` \(hash: abc1234\)/u;
const NEXT_TASK_IN_PROGRESS_PATTERN =
  /3\. \[IN_PROGRESS\] `phase2\.stream3\.task2`/u;
const CLOSEOUT_RESERVED_DONE_PATTERN =
  /3\. \[DONE\] `phase6\.stream1\.task2` Reserved post-closeout handoff anchor/u;

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
  "currentTaskId": "phase2.stream3.task1",
  "expectedCommitMessage": "feat: add plan markdown updater",
  "debt": null
}
\`\`\`
<!-- codeai-plan-state:end -->

## Phase 2 - Commit Transaction

1. [IN_PROGRESS] \`phase2.stream3.task1\` Add markdown updater.
   - scope: \`scripts/plan-orchestrator/*\`
   - expected commit: \`feat: add plan markdown updater\`
2. [TODO] \`phase2.stream3.commit1\` Git Commit: \`feat: add plan markdown updater\` (hash: TBD)
3. [TODO] \`phase2.stream3.task2\` Add debt primitives.
   - scope: \`scripts/plan-orchestrator/*\`
   - expected commit: \`feat: add plan transaction debt state\`
4. [TODO] \`phase2.stream3.commit2\` Git Commit: \`feat: add plan transaction debt state\` (hash: TBD)
`;

const createCloseoutMarkdown = () => `# План разработки

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "closeout-test",
  "branch": "main",
  "baseHead": "1111111",
  "lastRecordedCommit": "1111111",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Plan_Example.md",
  "currentTaskId": "phase6.stream1.task1",
  "expectedCommitMessage": "docs: close example plan",
  "debt": null
}
\`\`\`
<!-- codeai-plan-state:end -->

## Phase 6 - Scope Closeout

1. [IN_PROGRESS] \`phase6.stream1.task1\` Close accepted scope.
   - expected commit: \`docs: close example plan\`
2. [TODO] \`phase6.stream1.commit1\` Git Commit: \`docs: close example plan\` (hash: TBD)
3. [TODO] \`phase6.stream1.task2\` Reserved post-closeout handoff anchor; do not execute automatically unless the user asks for another cycle.
`;

test("marks current task done and paired commit pending", () => {
  const markdown = markTaskDoneAndCommitPending(
    createMarkdown(),
    "phase2.stream3.task1"
  );
  const parsed = parsePlanStateMarkdown(markdown);

  assert.match(markdown, TASK_DONE_PATTERN);
  assert.match(markdown, COMMIT_PENDING_PATTERN);
  assert.deepEqual(parsed.state.debt, {
    expectedCommitMessage: "feat: add plan markdown updater",
    stage: "commit_pending",
    taskId: "phase2.stream3.task1",
  });
});

test("finalizes commit hash and advances to next task", () => {
  const pending = markTaskDoneAndCommitPending(
    createMarkdown(),
    "phase2.stream3.task1"
  );
  const markdown = finalizeCommitAndAdvance(pending, {
    commitHash: "abc1234",
    taskId: "phase2.stream3.task1",
  });
  const parsed = parsePlanStateMarkdown(markdown);

  assert.match(markdown, COMMIT_DONE_PATTERN);
  assert.match(markdown, COMMIT_HASH_PATTERN);
  assert.match(markdown, NEXT_TASK_IN_PROGRESS_PATTERN);
  assert.equal(parsed.state.currentTaskId, "phase2.stream3.task2");
  assert.equal(
    parsed.state.expectedCommitMessage,
    "feat: add plan transaction debt state"
  );
  assert.equal(parsed.state.lastRecordedCommit, "abc1234");
  assert.equal(parsed.state.debt, null);
});

test("finalizes closeout commit into NONE state instead of reserved handoff", () => {
  const pending = markTaskDoneAndCommitPending(
    createCloseoutMarkdown(),
    "phase6.stream1.task1"
  );
  const markdown = finalizeCommitAndAdvance(pending, {
    commitHash: "def5678",
    taskId: "phase6.stream1.task1",
  });
  const parsed = parsePlanStateMarkdown(markdown);

  assert.match(markdown, CLOSEOUT_RESERVED_DONE_PATTERN);
  assert.equal(parsed.state.executionScopeStatus, "NONE");
  assert.equal(parsed.state.currentTaskId, null);
  assert.equal(parsed.state.expectedCommitMessage, null);
  assert.equal(parsed.state.lastRecordedCommit, "def5678");
  assert.equal(parsed.state.debt, null);
});
