import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { runPlanCommit } from "./plan-commit.mjs";

const README_PATTERN = /README\.md/u;
const COMMIT_PENDING_PATTERN = /commit_pending/u;

const runGit = (cwd, args) =>
  execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });

const createPlanMarkdown = () => `# Development TODO Plan

<!-- codeai-plan-state:start -->
\`\`\`json
{
  "schema": "codeai-plan-v1",
  "executionScopeStatus": "ACTIVE",
  "planId": "plan-commit-test",
  "branch": "main",
  "baseHead": "initial",
  "lastRecordedCommit": "initial",
  "planningSource": "doc/SolidWorks-WorkFlow/Plans/Plan_Orchestrator_Architecture.md",
  "currentTaskId": "phase1.task1",
  "expectedCommitMessage": "fix: let plan commit stage scoped files",
  "debt": null
}
\`\`\`
<!-- codeai-plan-state:end -->

1. [IN_PROGRESS] \`phase1.task1\` Update scoped files (scope: \`src/**, doc/TODO/todo-plan.md\`; expected commit: \`fix: let plan commit stage scoped files\`).
2. [TODO] Git Commit: \`fix: let plan commit stage scoped files\` (hash: TBD)
3. [TODO] \`phase1.task2\` Next task (scope: \`docs/**\`; expected commit: \`docs: next\`).
4. [TODO] Git Commit: \`docs: next\` (hash: TBD)
`;

const createRepository = () => {
  const cwd = mkdtempSync(join(tmpdir(), "plan-commit-"));
  mkdirSync(join(cwd, "doc/TODO"), { recursive: true });
  mkdirSync(join(cwd, "src"), { recursive: true });
  writeFileSync(join(cwd, "doc/TODO/todo-plan.md"), createPlanMarkdown());
  writeFileSync(join(cwd, "src/app.ts"), "export const value = 1;\n");
  writeFileSync(join(cwd, "src/remove.ts"), "export const oldValue = 1;\n");
  runGit(cwd, ["init", "-b", "main"]);
  runGit(cwd, ["config", "user.email", "test@example.com"]);
  runGit(cwd, ["config", "user.name", "Plan Test"]);
  runGit(cwd, ["add", "."]);
  runGit(cwd, ["commit", "-m", "chore: initial"]);

  return cwd;
};

test("plan commit stages dirty files inside current task scope", () => {
  const cwd = createRepository();
  writeFileSync(join(cwd, "src/app.ts"), "export const value = 2;\n");
  writeFileSync(join(cwd, "src/new.ts"), "export const next = 3;\n");

  runPlanCommit({
    cwd,
    message: "fix: let plan commit stage scoped files",
  });

  const committedFiles = runGit(cwd, [
    "show",
    "--name-only",
    "--pretty=format:",
    "HEAD",
  ])
    .split("\n")
    .filter(Boolean);

  assert.deepEqual(committedFiles.sort(), [
    "doc/TODO/todo-plan.md",
    "src/app.ts",
    "src/new.ts",
  ]);
  assert.equal(runGit(cwd, ["status", "--short"]), "");
});

test("plan commit stages scoped renames and deletes", () => {
  const cwd = createRepository();
  renameSync(join(cwd, "src/remove.ts"), join(cwd, "src/renamed.ts"));

  runPlanCommit({
    cwd,
    message: "fix: let plan commit stage scoped files",
  });

  assert.equal(runGit(cwd, ["status", "--short"]), "");
  assert.equal(runGit(cwd, ["ls-files", "src/remove.ts"]), "");
  assert.equal(runGit(cwd, ["ls-files", "src/renamed.ts"]), "src/renamed.ts\n");
});

test("plan commit blocks dirty files outside current task scope", () => {
  const cwd = createRepository();
  writeFileSync(join(cwd, "README.md"), "# outside\n");

  assert.throws(
    () =>
      runPlanCommit({
        cwd,
        message: "fix: let plan commit stage scoped files",
      }),
    README_PATTERN
  );
  assert.doesNotMatch(
    readFileSync(join(cwd, "doc/TODO/todo-plan.md"), "utf8"),
    COMMIT_PENDING_PATTERN
  );
});
