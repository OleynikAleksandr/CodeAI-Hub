import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runPlanComplete } from "./plan-complete.mjs";
import { completeNoCommitTaskAndAdvance } from "./plan-markdown-updater.mjs";
import { parsePlanStateMarkdown } from "./plan-state-parser.mjs";

const CURRENT_TASK_DONE_PATTERN =
  /1\. \[DONE\] `phase4\.stream8\.task1` User checks recovery behavior\. Result: passed recovery check/u;
const NEXT_TASK_IN_PROGRESS_PATTERN =
  /2\. \[IN_PROGRESS\] `phase4\.stream8\.task2` User checks status output\./u;
const COMMAND_RESULT_PATTERN = /Result: passed command check/u;

const createMarkdown = () => `# План разработки

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "plan-orchestrator-2026-05-03",
  "branch": "main",
  "baseHead": "0debb4a32",
  "lastRecordedCommit": "1b22f2e5e",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Plan_Orchestrator_Architecture.md",
  "currentTaskId": "phase4.stream8.task1",
  "expectedCommitMessage": null,
  "debt": null
}
\`\`\`
<!-- codeai-plan-state:end -->

1. [IN_PROGRESS] \`phase4.stream8.task1\` User checks recovery behavior.
2. [TODO] \`phase4.stream8.task2\` User checks status output.
3. [TODO] \`phase4.stream9.task1\` Record acceptance.
   - expected commit: \`docs: record plan orchestrator workflow acceptance\`
4. [TODO] \`phase4.stream9.commit1\` Git Commit: \`docs: record plan orchestrator workflow acceptance\` (hash: TBD)
`;

const createTempRepo = () => {
  const cwd = mkdtempSync(join(tmpdir(), "plan-complete-"));
  mkdirSync(join(cwd, "doc", "TODO"), { recursive: true });
  writeFileSync(join(cwd, "doc", "TODO", "todo-plan.md"), createMarkdown());
  execFileSync("git", ["init", "-b", "main"], { cwd, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "codex@example.test"], {
    cwd,
  });
  execFileSync("git", ["config", "user.name", "Codex Test"], { cwd });
  execFileSync("git", ["add", "doc/TODO/todo-plan.md"], {
    cwd,
    stdio: "ignore",
  });
  execFileSync("git", ["commit", "-m", "test: seed plan"], {
    cwd,
    stdio: "ignore",
  });

  return cwd;
};

test("completes no-commit task and advances to next task", () => {
  const markdown = completeNoCommitTaskAndAdvance(createMarkdown(), {
    result: "passed recovery check",
    taskId: "phase4.stream8.task1",
  });
  const parsed = parsePlanStateMarkdown(markdown);

  assert.match(markdown, CURRENT_TASK_DONE_PATTERN);
  assert.match(markdown, NEXT_TASK_IN_PROGRESS_PATTERN);
  assert.equal(parsed.state.currentTaskId, "phase4.stream8.task2");
  assert.equal(parsed.state.expectedCommitMessage, null);
  assert.equal(parsed.state.lastRecordedCommit, "1b22f2e5e");
  assert.equal(parsed.state.debt, null);
});

test("sets expected commit when the next task has a paired commit", () => {
  const first = completeNoCommitTaskAndAdvance(createMarkdown(), {
    result: "passed recovery check",
    taskId: "phase4.stream8.task1",
  });
  const second = completeNoCommitTaskAndAdvance(first, {
    result: "passed status check",
    taskId: "phase4.stream8.task2",
  });
  const parsed = parsePlanStateMarkdown(second);

  assert.equal(parsed.state.currentTaskId, "phase4.stream9.task1");
  assert.equal(
    parsed.state.expectedCommitMessage,
    "docs: record plan orchestrator workflow acceptance"
  );
});

test("writes no-commit completion through the command module", () => {
  const cwd = createTempRepo();

  runPlanComplete({ cwd, result: "passed command check" });

  const markdown = readFileSync(
    join(cwd, "doc", "TODO", "todo-plan.md"),
    "utf8"
  );
  const parsed = parsePlanStateMarkdown(markdown);

  assert.match(markdown, COMMAND_RESULT_PATTERN);
  assert.equal(parsed.state.currentTaskId, "phase4.stream8.task2");
});
