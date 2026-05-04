import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runPlanSnapshot } from "./plan-snapshot.mjs";

const FIXED_DATE = new Date("2026-05-04T13:00:00.000Z");
const EXPECTED_SNAPSHOT =
  "doc/TODO/Archive/todo-plan-snapshot-plan-orchestrator-deferred-verification-2026-05-04-2026-05-04T13-00-00-000Z.md";
const SNAPSHOT_NOTE_PATTERN = /Result note:\*\* snapshot fixture passed/u;
const SNAPSHOT_CURRENT_TASK_PATTERN =
  /Current Task:\*\* phase2\.stream1\.task1/u;
const SNAPSHOT_LAST_COMMIT_PATTERN = /Last Recorded Commit:\*\* 4ac6ddf5a/u;
const RECOVERY_PACK_PATTERN = /## Recovery Pack/u;
const MARKDOWN_FENCE_PATTERN = /````markdown/u;
const INVALID_CURRENT_TASK_PATTERN = /PLAN_CURRENT_TASK_STATUS_INVALID/u;
const DEBT_EXISTS_PATTERN = /PLAN_DEBT_EXISTS/u;

const createMarkdown = ({
  currentTaskStatus = "IN_PROGRESS",
  debt = null,
} = {}) => `# Development TODO Plan

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "plan-orchestrator-deferred-verification-2026-05-04",
  "branch": "main",
  "baseHead": "016d07741",
  "lastRecordedCommit": "4ac6ddf5a",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Plan_Orchestrator_Deferred_Verification_Architecture.md",
  "currentTaskId": "phase2.stream1.task1",
  "expectedCommitMessage": "feat: add plan snapshot command",
  "debt": ${debt === null ? "null" : JSON.stringify(debt)}
}
\`\`\`
<!-- codeai-plan-state:end -->

## Recovery Pack

- **Current phase/stream/task:** Phase 2 / Stream 1 / Task 1.
- **Next action:** add plan snapshot automation.
- **Last completed commit before this cycle:** \`4ac6ddf5a\`.

## Phase 2

1. [${currentTaskStatus}] \`phase2.stream1.task1\` Add \`plan:snapshot\` command.
   - expected commit: \`feat: add plan snapshot command\`
2. [TODO] \`phase2.stream1.commit1\` Git Commit: \`feat: add plan snapshot command\` (hash: TBD)
`;

const createTempRepo = ({ markdown = createMarkdown() } = {}) => {
  const cwd = mkdtempSync(join(tmpdir(), "plan-snapshot-"));
  mkdirSync(join(cwd, "doc", "TODO", "Archive"), { recursive: true });
  writeFileSync(
    join(cwd, ".gitignore"),
    "doc/TODO/*\n!doc/TODO/Archive/\n!doc/TODO/Archive/*.md\n"
  );
  writeFileSync(join(cwd, "doc", "TODO", "todo-plan.md"), markdown);
  execFileSync("git", ["init", "-b", "main"], { cwd, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "codex@example.test"], {
    cwd,
  });
  execFileSync("git", ["config", "user.name", "Codex Test"], { cwd });
  execFileSync("git", ["add", ".gitignore"], { cwd, stdio: "ignore" });
  execFileSync("git", ["commit", "-m", "test: seed repo"], {
    cwd,
    stdio: "ignore",
  });

  return cwd;
};

test("writes a non-ignored snapshot with state, recovery pack, and note", () => {
  const cwd = createTempRepo();
  const result = runPlanSnapshot({
    cwd,
    note: "snapshot fixture passed",
    now: FIXED_DATE,
  });
  const snapshot = readFileSync(result.snapshotPath, "utf8");

  assert.equal(result.snapshotRelativePath, EXPECTED_SNAPSHOT);
  assert.equal(existsSync(result.snapshotPath), true);
  assert.match(snapshot, SNAPSHOT_NOTE_PATTERN);
  assert.match(snapshot, SNAPSHOT_CURRENT_TASK_PATTERN);
  assert.match(snapshot, SNAPSHOT_LAST_COMMIT_PATTERN);
  assert.match(snapshot, RECOVERY_PACK_PATTERN);
  assert.match(snapshot, MARKDOWN_FENCE_PATTERN);
  assert.throws(
    () =>
      execFileSync("git", ["check-ignore", "-q", result.snapshotRelativePath], {
        cwd,
        stdio: "ignore",
      }),
    (error) => error.status === 1
  );
});

test("refuses to snapshot an invalid active plan", () => {
  const cwd = createTempRepo({
    markdown: createMarkdown({ currentTaskStatus: "TODO" }),
  });

  assert.throws(
    () =>
      runPlanSnapshot({
        cwd,
        note: "invalid fixture",
        now: FIXED_DATE,
      }),
    INVALID_CURRENT_TASK_PATTERN
  );
});

test("refuses to snapshot when plan debt exists", () => {
  const cwd = createTempRepo({
    markdown: createMarkdown({ debt: { stage: "commit_pending" } }),
  });

  assert.throws(
    () =>
      runPlanSnapshot({
        cwd,
        note: "debt fixture",
        now: FIXED_DATE,
      }),
    DEBT_EXISTS_PATTERN
  );
});

test("does not mutate active task pointer or active plan markdown", () => {
  const markdown = createMarkdown();
  const cwd = createTempRepo({ markdown });

  runPlanSnapshot({
    cwd,
    note: "non mutating fixture",
    now: FIXED_DATE,
  });

  assert.equal(
    readFileSync(join(cwd, "doc", "TODO", "todo-plan.md"), "utf8"),
    markdown
  );
});
