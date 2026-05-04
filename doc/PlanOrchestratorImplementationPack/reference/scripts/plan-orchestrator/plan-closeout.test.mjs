import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runPlanCloseout } from "./plan-closeout.mjs";
import { parsePlanStateMarkdown } from "./plan-state-parser.mjs";

const FIXED_DATE = new Date("2026-05-04T14:00:00.000Z");
const CLOSEOUT_ARCHIVE =
  "doc/TODO/Archive/todo-plan-closeout-plan-orchestrator-closeout-fixture.md";
const PLANNING_SOURCE =
  "doc/SolidWorks-WorkFlow/Plans/Closeout_Fixture_Architecture.md";
const PLANNING_ARCHIVE =
  "doc/SolidWorks-WorkFlow/Plans/Archive/Closeout_Fixture_Architecture.md";
const ACCEPTANCE_PATTERN = /Acceptance:\*\* user accepted fixture closeout/u;
const PLANNING_DISPOSITION_MOVED_PATTERN =
  /Planning Source Disposition:\*\* moved/u;
const INVALID_CURRENT_TASK_PATTERN = /PLAN_CURRENT_TASK_STATUS_INVALID/u;
const DEBT_EXISTS_PATTERN = /PLAN_DEBT_EXISTS/u;
const ACCEPTANCE_REQUIRED_PATTERN = /Usage: npm run plan:closeout/u;

const createMarkdown = ({
  currentTaskStatus = "IN_PROGRESS",
  debt = null,
} = {}) => `# Development TODO Plan

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "plan-orchestrator-closeout-fixture",
  "branch": "main",
  "baseHead": "111111111",
  "lastRecordedCommit": "222222222",
  "planningSource": "${PLANNING_SOURCE}",
  "currentTaskId": "phase4.stream4.task1",
  "expectedCommitMessage": "docs: close fixture plan",
  "debt": ${debt === null ? "null" : JSON.stringify(debt)}
}
\`\`\`
<!-- codeai-plan-state:end -->

## Context Pack For This Cycle

- **Planning source:** \`${PLANNING_SOURCE}\`

## Phase 4

1. [${currentTaskStatus}] \`phase4.stream4.task1\` Scope Closeout task.
   - expected commit: \`docs: close fixture plan\`
2. [TODO] \`phase4.stream4.commit1\` Git Commit: \`docs: close fixture plan\` (hash: TBD)
3. [TODO] \`phase4.stream4.task2\` Reserved post-closeout handoff anchor.
`;

const createTempRepo = ({ markdown = createMarkdown() } = {}) => {
  const cwd = mkdtempSync(join(tmpdir(), "plan-closeout-"));
  mkdirSync(join(cwd, "doc", "TODO", "Archive"), { recursive: true });
  mkdirSync(join(cwd, "doc", "SolidWorks-WorkFlow", "Plans"), {
    recursive: true,
  });
  mkdirSync(join(cwd, "doc", "SolidWorks-WorkFlow", "Plans", "Archive"), {
    recursive: true,
  });
  writeFileSync(
    join(cwd, ".gitignore"),
    ["doc/TODO/*", "!doc/TODO/Archive/", "!doc/TODO/Archive/*.md", ""].join(
      "\n"
    )
  );
  writeFileSync(join(cwd, "doc", "TODO", "todo-plan.md"), markdown);
  writeFileSync(
    join(cwd, PLANNING_SOURCE),
    "# Closeout Fixture Architecture\n"
  );
  writeFileSync(
    join(cwd, "doc", "SolidWorks-WorkFlow", "Docs_Index.md"),
    `- \`${PLANNING_SOURCE}\` — active fixture.\n`
  );
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

test("closes accepted plan into archive, planning archive, and docs index", () => {
  const cwd = createTempRepo();
  const result = runPlanCloseout({
    acceptance: "user accepted fixture closeout",
    cwd,
    now: FIXED_DATE,
  });
  const closeoutArchive = readFileSync(join(cwd, CLOSEOUT_ARCHIVE), "utf8");
  const planMarkdown = readFileSync(
    join(cwd, "doc", "TODO", "todo-plan.md"),
    "utf8"
  );
  const planState = parsePlanStateMarkdown(planMarkdown).state;
  const docsIndex = readFileSync(
    join(cwd, "doc", "SolidWorks-WorkFlow", "Docs_Index.md"),
    "utf8"
  );

  assert.equal(result.closeoutArchiveRelativePath, CLOSEOUT_ARCHIVE);
  assert.equal(result.planningArchivePath, PLANNING_ARCHIVE);
  assert.equal(result.planningDisposition, "moved");
  assert.equal(existsSync(join(cwd, PLANNING_SOURCE)), false);
  assert.equal(existsSync(join(cwd, PLANNING_ARCHIVE)), true);
  assert.equal(planState.planningSource, PLANNING_ARCHIVE);
  assert.match(planMarkdown, new RegExp(PLANNING_ARCHIVE, "u"));
  assert.match(docsIndex, new RegExp(PLANNING_ARCHIVE, "u"));
  assert.match(closeoutArchive, ACCEPTANCE_PATTERN);
  assert.match(closeoutArchive, PLANNING_DISPOSITION_MOVED_PATTERN);
});

test("requires explicit acceptance evidence", () => {
  const cwd = createTempRepo();

  assert.throws(
    () => runPlanCloseout({ acceptance: " ", cwd, now: FIXED_DATE }),
    ACCEPTANCE_REQUIRED_PATTERN
  );
});

test("refuses closeout when plan debt exists", () => {
  const cwd = createTempRepo({
    markdown: createMarkdown({ debt: { stage: "commit_pending" } }),
  });

  assert.throws(
    () =>
      runPlanCloseout({
        acceptance: "user accepted fixture closeout",
        cwd,
        now: FIXED_DATE,
      }),
    DEBT_EXISTS_PATTERN
  );
});

test("refuses closeout when active plan validation fails", () => {
  const cwd = createTempRepo({
    markdown: createMarkdown({ currentTaskStatus: "TODO" }),
  });

  assert.throws(
    () =>
      runPlanCloseout({
        acceptance: "user accepted fixture closeout",
        cwd,
        now: FIXED_DATE,
      }),
    INVALID_CURRENT_TASK_PATTERN
  );
});

test("retries idempotently without duplicate closeout artifacts", () => {
  const cwd = createTempRepo();

  runPlanCloseout({
    acceptance: "user accepted fixture closeout",
    cwd,
    now: FIXED_DATE,
  });
  const retry = runPlanCloseout({
    acceptance: "user accepted fixture closeout",
    cwd,
    now: FIXED_DATE,
  });
  const todoArchives = readdirSync(join(cwd, "doc", "TODO", "Archive")).filter(
    (fileName) => fileName.startsWith("todo-plan-closeout-")
  );

  assert.equal(retry.closeoutArchiveRelativePath, CLOSEOUT_ARCHIVE);
  assert.equal(retry.planningDisposition, "already_archived");
  assert.deepEqual(todoArchives, [
    "todo-plan-closeout-plan-orchestrator-closeout-fixture.md",
  ]);
});
