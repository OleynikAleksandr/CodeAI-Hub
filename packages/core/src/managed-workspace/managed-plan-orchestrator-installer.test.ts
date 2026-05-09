import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { ManagedPlanOrchestratorInstaller } from "./managed-plan-orchestrator-installer";

const createWorkspaceRoot = (): Promise<string> =>
  mkdtemp(path.join(os.tmpdir(), "managed-plan-"));
const execFileAsync = promisify(execFile);
const ACTIVE_SCOPE_RE = /Execution Scope Status: ACTIVE/u;
const DIAGRAM_TASK_RE = /Current Task: diagram-modules\.stream1\.task1/u;
const DIAGRAM_PLAN_TASK_RE =
  /"currentTaskId": "diagram-modules\.stream1\.task1"/u;
const DIAGRAM_NEXT_TASK_RE =
  /Current Task: diagram-modules\.product-part\.project-manager/u;
const DIAGRAM_NEXT_COMMIT_RE =
  /Expected Commit: docs: update diagram modules product part project-manager/u;
const APPLICATION_SKELETON_TASK_RE =
  /Current Task: application-skeleton\.stream1\.task1/u;
const APPLICATION_SKELETON_DRAFT_COMMIT_RE =
  /Expected Commit: docs: draft application skeleton contract/u;
const APPLICATION_SKELETON_MATERIALIZE_TASK_RE =
  /Current Task: application-skeleton\.stream1\.task2/u;
const APPLICATION_SKELETON_MATERIALIZE_COMMIT_RE =
  /Expected Commit: feat: materialize application skeleton/u;
const APPLICATION_SKELETON_BOUNDED_GROUP_RE = /bounded target-group microtask/u;
const LEDGER_COMMIT_RE = /chore: record managed workspace ledger/u;
const DIAGRAM_MODULES_COMMIT_RE =
  /docs: update diagram modules product part index/u;
const PLAN_COMMIT_HASH_RE = /hash: [0-9a-f]+/u;
const PRODUCT_PART_SUMMARY_RE =
  /Materialize only Diagram Modules Product Part "project-manager"/u;
const INDEX_SUMMARY_RE = /Update Diagram Modules Product Part index artifact/u;
const INCLUDED_IN_COMMIT_RE = /included-in-commit/u;
const WORKSPACE_CHANGED_FILES_RE =
  /"changedFiles": \[\n\s+"\.codeai-hub\/demo-workspace\/diagram_modules\/product-parts\.index\.md"/u;
const WORKSPACE_COMMIT_HASH_RE = /"commitHash": "[0-9a-f]+"/u;
const WORKSPACE_ACCEPTED_COMMIT_RE = /"acceptedCommits": \[\n\s+\{/u;
const WORKSPACE_LAST_COMMIT_RE =
  /"lastAcceptedCommitMessage": "docs: update diagram modules product part index"/u;
const WORKSPACE_PLAN_ACTIVE_STAGE_RE = /"activeStage": "diagram_modules"/u;
const DIAGRAM_STAGE_PLAN_RE =
  /doc\/TODO\/stages\/diagram-modules\/todo-plan\.md/u;
const ROOT_TODO_PLAN_PATH = "doc/TODO/todo-plan.md";
const DIAGRAM_STAGE_PLAN_PATH = "doc/TODO/stages/diagram-modules/todo-plan.md";

test("ManagedPlanOrchestratorInstaller writes plan scripts, hooks, and package scripts", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
    await writeFile(
      path.join(workspaceRoot, "package.json"),
      `${JSON.stringify({ name: "demo", scripts: { test: "node test.js" } }, null, 2)}\n`,
      "utf8"
    );

    const result = await new ManagedPlanOrchestratorInstaller().install(
      workspaceRoot
    );

    assert.equal(result.hooksWritten.length, 5);
    assert.equal(result.packageScripts.includes("plan:status"), true);
    assert.equal(
      await readFile(
        path.join(workspaceRoot, "scripts/plan-orchestrator/plan-cli.mjs"),
        "utf8"
      ).then((content) => content.includes("codeai-plan-state:start")),
      true
    );
    assert.match(
      await readFile(
        path.join(workspaceRoot, "doc/TODO/workspace.plan.md"),
        "utf8"
      ),
      WORKSPACE_PLAN_ACTIVE_STAGE_RE
    );
    assert.match(
      await readFile(
        path.join(workspaceRoot, "doc/TODO/workspace.plan.md"),
        "utf8"
      ),
      DIAGRAM_STAGE_PLAN_RE
    );
    assert.match(
      await readFile(path.join(workspaceRoot, DIAGRAM_STAGE_PLAN_PATH), "utf8"),
      DIAGRAM_PLAN_TASK_RE
    );
    await assert.rejects(access(path.join(workspaceRoot, ROOT_TODO_PLAN_PATH)));

    const packageJson = JSON.parse(
      await readFile(path.join(workspaceRoot, "package.json"), "utf8")
    );
    assert.equal(packageJson.scripts.test, "node test.js");
    assert.equal(
      packageJson.scripts["plan:validate"],
      "node ./scripts/plan-orchestrator/plan-cli.mjs validate"
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("ManagedPlanOrchestratorInstaller writes a plan shim that reads the generated todo plan", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
    await new ManagedPlanOrchestratorInstaller().install(workspaceRoot);
    const scriptPath = path.join(
      workspaceRoot,
      "scripts/plan-orchestrator/plan-cli.mjs"
    );

    const result = await execFileAsync(
      process.execPath,
      [scriptPath, "status"],
      {
        cwd: workspaceRoot,
      }
    );

    assert.match(result.stdout, ACTIVE_SCOPE_RE);
    assert.match(result.stdout, DIAGRAM_TASK_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("ManagedPlanOrchestratorInstaller seeds todo plan for active workflow stage", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
    await new ManagedPlanOrchestratorInstaller().install(workspaceRoot, {
      initialStage: "application_skeleton",
    });
    const scriptPath = path.join(
      workspaceRoot,
      "scripts/plan-orchestrator/plan-cli.mjs"
    );

    const result = await execFileAsync(
      process.execPath,
      [scriptPath, "status"],
      { cwd: workspaceRoot }
    );

    assert.match(result.stdout, APPLICATION_SKELETON_TASK_RE);
    assert.match(result.stdout, APPLICATION_SKELETON_DRAFT_COMMIT_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("managed plan shim advances filesystem stage draft commits to materialization", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
    await execFileAsync("git", ["init"], { cwd: workspaceRoot });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], {
      cwd: workspaceRoot,
    });
    await execFileAsync("git", ["config", "user.name", "Test User"], {
      cwd: workspaceRoot,
    });
    await execFileAsync("git", ["config", "core.hooksPath", ".husky"], {
      cwd: workspaceRoot,
    });
    await new ManagedPlanOrchestratorInstaller().install(workspaceRoot, {
      initialStage: "application_skeleton",
    });
    const scriptPath = path.join(
      workspaceRoot,
      "scripts/plan-orchestrator/plan-cli.mjs"
    );
    const artifactPath = path.join(
      workspaceRoot,
      ".codeai-hub/demo-workspace/application_skeleton/application-skeleton.md"
    );
    await mkdir(path.dirname(artifactPath), { recursive: true });
    await writeFile(artifactPath, "# Application Skeleton\n", "utf8");
    await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });

    await execFileAsync(
      process.execPath,
      [scriptPath, "commit", "docs: draft application skeleton contract"],
      { cwd: workspaceRoot }
    );

    const status = await execFileAsync(
      process.execPath,
      [scriptPath, "status"],
      { cwd: workspaceRoot }
    );
    const plan = await readFile(
      path.join(
        workspaceRoot,
        "doc/TODO/stages/application-skeleton/todo-plan.md"
      ),
      "utf8"
    );
    const gitStatus = await execFileAsync("git", ["status", "--short"], {
      cwd: workspaceRoot,
    });

    assert.match(status.stdout, APPLICATION_SKELETON_MATERIALIZE_TASK_RE);
    assert.match(status.stdout, APPLICATION_SKELETON_MATERIALIZE_COMMIT_RE);
    assert.match(plan, APPLICATION_SKELETON_BOUNDED_GROUP_RE);
    assert.equal(gitStatus.stdout.trim(), "");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("managed plan shim advances the active task inside plan commits", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
    await execFileAsync("git", ["init"], { cwd: workspaceRoot });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], {
      cwd: workspaceRoot,
    });
    await execFileAsync("git", ["config", "user.name", "Test User"], {
      cwd: workspaceRoot,
    });
    await execFileAsync("git", ["config", "core.hooksPath", ".husky"], {
      cwd: workspaceRoot,
    });
    await new ManagedPlanOrchestratorInstaller().install(workspaceRoot);
    const scriptPath = path.join(
      workspaceRoot,
      "scripts/plan-orchestrator/plan-cli.mjs"
    );
    const artifactPath = path.join(
      workspaceRoot,
      ".codeai-hub/demo-workspace/diagram_modules/product-parts.index.md"
    );
    await mkdir(path.dirname(artifactPath), { recursive: true });
    await writeFile(
      artifactPath,
      "# Product Parts\n\n### Product Part: project-manager\n",
      "utf8"
    );
    await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });

    await execFileAsync(
      process.execPath,
      [scriptPath, "commit", "docs: update diagram modules product part index"],
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
    const workspacePlan = await readFile(
      path.join(workspaceRoot, "doc/TODO/workspace.plan.md"),
      "utf8"
    );
    const gitLog = await execFileAsync("git", ["log", "--pretty=%s", "-2"], {
      cwd: workspaceRoot,
    });
    const gitStatus = await execFileAsync("git", ["status", "--short"], {
      cwd: workspaceRoot,
    });

    assert.match(status.stdout, DIAGRAM_NEXT_TASK_RE);
    assert.match(status.stdout, DIAGRAM_NEXT_COMMIT_RE);
    assert.doesNotMatch(plan, INCLUDED_IN_COMMIT_RE);
    assert.match(plan, PLAN_COMMIT_HASH_RE);
    assert.match(plan, PRODUCT_PART_SUMMARY_RE);
    assert.match(workspacePlan, WORKSPACE_ACCEPTED_COMMIT_RE);
    assert.match(workspacePlan, INDEX_SUMMARY_RE);
    assert.match(workspacePlan, WORKSPACE_CHANGED_FILES_RE);
    assert.match(workspacePlan, WORKSPACE_LAST_COMMIT_RE);
    assert.match(workspacePlan, WORKSPACE_COMMIT_HASH_RE);
    assert.match(gitLog.stdout, LEDGER_COMMIT_RE);
    assert.match(gitLog.stdout, DIAGRAM_MODULES_COMMIT_RE);
    await assert.rejects(access(path.join(workspaceRoot, ROOT_TODO_PLAN_PATH)));
    assert.equal(gitStatus.stdout.trim(), "");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
