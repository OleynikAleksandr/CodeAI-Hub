import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ManagedPlanOrchestratorInstaller } from "./managed-plan-orchestrator-installer";
import {
  NEXT_STAGE_AFTER,
  STAGE_PLANS,
  STAGE_TERMINAL_COMMITS,
} from "./managed-todo-tree";
import { createManagedWorkspacePaths } from "./managed-workspace-paths";

const APPLICATION_SKELETON_STAGE_RE = /application_skeleton/u;
const ACTIVE_DIAGRAM_MODULES_STAGE_RE = /"activeStage": "diagram_modules"/u;
const DIAGRAM_MODULES_STAGE_RE = /diagram_modules/u;

const createWorkspaceRoot = (): Promise<string> =>
  mkdtemp(path.join(os.tmpdir(), "managed-plan-installer-disabled-"));

const exists = async (absolutePath: string): Promise<boolean> => {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
};

test("ManagedPlanOrchestratorInstaller keeps legacy plan CLI, hooks, and package scripts disabled", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
    const result = await new ManagedPlanOrchestratorInstaller().install(
      workspaceRoot,
      { initialStage: "application_skeleton" }
    );
    const paths = createManagedWorkspacePaths(workspaceRoot);
    const todoPlanText = await readFile(paths.todoPlan.absolutePath, "utf8");

    assert.equal(result.todoPlanCreated, true);
    assert.deepEqual(result.hooksWritten, []);
    assert.deepEqual(result.packageScripts, []);
    assert.match(todoPlanText, APPLICATION_SKELETON_STAGE_RE);
    assert.equal(await exists(paths.planCommandDirectory.absolutePath), false);
    assert.equal(await exists(paths.hookDirectory.absolutePath), false);
    assert.equal(await exists(paths.packageManifest.absolutePath), false);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("ManagedPlanOrchestratorInstaller preserves an existing managed todo plan without reinstalling legacy control scripts", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
    const installer = new ManagedPlanOrchestratorInstaller();
    const first = await installer.install(workspaceRoot, {
      initialStage: "diagram_modules",
    });
    const second = await installer.install(workspaceRoot, {
      initialStage: "diagram_modules",
    });
    const paths = createManagedWorkspacePaths(workspaceRoot);
    const todoPlanText = await readFile(paths.todoPlan.absolutePath, "utf8");

    assert.equal(first.todoPlanCreated, true);
    assert.equal(second.todoPlanCreated, false);
    assert.deepEqual(second.hooksWritten, []);
    assert.deepEqual(second.packageScripts, []);
    assert.match(todoPlanText, DIAGRAM_MODULES_STAGE_RE);
    assert.match(todoPlanText, ACTIVE_DIAGRAM_MODULES_STAGE_RE);
    assert.equal(await exists(paths.planCommandDirectory.absolutePath), false);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("managed stage metadata remains available as read-only planning context", () => {
  assert.equal(
    STAGE_PLANS.diagram_modules,
    "doc/TODO/stages/diagram-modules/todo-plan.md"
  );
  assert.equal(
    STAGE_PLANS.application_skeleton,
    "doc/TODO/stages/application-skeleton/todo-plan.md"
  );
  assert.equal(
    STAGE_TERMINAL_COMMITS.quality_gates,
    "feat: integrate quality gates baseline"
  );
  assert.equal(NEXT_STAGE_AFTER.diagram_modules, "application_skeleton");
});
