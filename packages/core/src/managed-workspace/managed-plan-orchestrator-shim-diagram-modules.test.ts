import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { ManagedPlanOrchestratorInstaller } from "./managed-plan-orchestrator-installer";

const execFileAsync = promisify(execFile);
const DIAGRAM_STAGE_PLAN_PATH = "doc/TODO/stages/diagram-modules/todo-plan.md";
const USER_RETURN_TASK_RE =
  /Current Task: diagram-modules\.user-return\.task1/u;
const EXPECTED_NONE_RE = /Expected Commit: none/u;
const USER_RETURN_PHASE_RE =
  /Phase 2 — Persistent Diagram Modules User Return/u;
const USER_REVIEW_TASK_RE = /diagram-modules\.user-review\.task1/u;
const USER_REVIEW_COMMIT_RE = /docs: review diagram modules product map/u;
const REVISION_INJECTION_RULE_RE = /inject a revisionN microtask pair/u;

const createWorkspaceRoot = (): Promise<string> =>
  mkdtemp(path.join(os.tmpdir(), "managed-diagram-shim-"));

const runGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], {
    cwd: workspaceRoot,
  });
  return stdout.trim();
};

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const createProductPartsIndex = (): string =>
  [
    "# Product Parts Index",
    "",
    "### Product Part: local-runtime",
    "- Id: local-runtime",
    "- Title: Local Runtime",
    "- Purpose: Runtime shell.",
    "- Status: planned",
    "",
  ].join("\n");

test("Diagram Modules final Product Part opens persistent user-return task without review commit", async () => {
  const workspaceRoot = await createWorkspaceRoot();

  try {
    await runGit(workspaceRoot, ["init"]);
    await runGit(workspaceRoot, ["config", "user.email", "test@example.com"]);
    await runGit(workspaceRoot, ["config", "user.name", "Test User"]);
    await runGit(workspaceRoot, ["config", "core.hooksPath", ".husky"]);
    await new ManagedPlanOrchestratorInstaller().install(workspaceRoot);
    const scriptPath = path.join(
      workspaceRoot,
      "scripts/plan-orchestrator/plan-cli.mjs"
    );

    await writeWorkspaceFile(
      workspaceRoot,
      ".codeai-hub/demo-workspace/diagram_modules/product-parts.index.md",
      createProductPartsIndex()
    );
    await runGit(workspaceRoot, ["add", "."]);
    await execFileAsync(
      process.execPath,
      [scriptPath, "commit", "docs: update diagram modules product part index"],
      { cwd: workspaceRoot }
    );

    await writeWorkspaceFile(
      workspaceRoot,
      ".codeai-hub/demo-workspace/diagram_modules/product-parts/local-runtime.md",
      "# Product Part: local-runtime\n"
    );
    await runGit(workspaceRoot, ["add", "."]);
    await execFileAsync(
      process.execPath,
      [
        scriptPath,
        "commit",
        "docs: update diagram modules product part local-runtime",
      ],
      { cwd: workspaceRoot }
    );

    const status = await execFileAsync(
      process.execPath,
      [scriptPath, "status"],
      { cwd: workspaceRoot }
    );
    const plan = await readFile(
      path.join(workspaceRoot, DIAGRAM_STAGE_PLAN_PATH),
      "utf8"
    );

    assert.match(status.stdout, USER_RETURN_TASK_RE);
    assert.match(status.stdout, EXPECTED_NONE_RE);
    assert.match(plan, USER_RETURN_PHASE_RE);
    assert.match(plan, REVISION_INJECTION_RULE_RE);
    assert.doesNotMatch(plan, USER_REVIEW_TASK_RE);
    assert.doesNotMatch(plan, USER_REVIEW_COMMIT_RE);
    assert.equal(await runGit(workspaceRoot, ["status", "--short"]), "");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
