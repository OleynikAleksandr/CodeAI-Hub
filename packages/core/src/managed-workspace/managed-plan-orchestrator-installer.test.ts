import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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
const APPLICATION_SKELETON_TASK_RE =
  /Current Task: application-skeleton\.stream1\.task1/u;
const APPLICATION_SKELETON_COMMIT_RE =
  /Expected Commit: feat: materialize application skeleton/u;

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
    assert.match(result.stdout, APPLICATION_SKELETON_COMMIT_RE);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
