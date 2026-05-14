import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ManagedPlanOrchestratorInstaller } from "./managed-plan-orchestrator-installer";
import { isLegacyManagedPlanCliShimRemoved } from "./managed-plan-orchestrator-shim-source";
import { createManagedWorkspacePaths } from "./managed-workspace-paths";

const ACTIVE_QUALITY_GATES_STAGE_RE = /"activeStage": "quality_gates"/u;

const createWorkspaceRoot = (): Promise<string> =>
  mkdtemp(path.join(os.tmpdir(), "quality-gates-shim-disabled-"));

const exists = async (absolutePath: string): Promise<boolean> => {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
};

test("Quality Gates generated plan shim source remains disabled", () => {
  assert.equal(isLegacyManagedPlanCliShimRemoved(), true);
});

test("Quality Gates install path keeps stage plan data without generated shim control flow", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
    const paths = createManagedWorkspacePaths(workspaceRoot);
    const result = await new ManagedPlanOrchestratorInstaller().install(
      workspaceRoot,
      { initialStage: "quality_gates" }
    );
    const workspacePlanText = await readFile(
      paths.todoPlan.absolutePath,
      "utf8"
    );

    assert.equal(result.todoPlanCreated, true);
    assert.deepEqual(result.hooksWritten, []);
    assert.deepEqual(result.packageScripts, []);
    assert.match(workspacePlanText, ACTIVE_QUALITY_GATES_STAGE_RE);
    assert.equal(await exists(paths.planCommandDirectory.absolutePath), false);
    assert.equal(await exists(paths.hookDirectory.absolutePath), false);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
