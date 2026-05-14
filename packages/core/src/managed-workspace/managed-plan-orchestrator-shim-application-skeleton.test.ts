import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ManagedPlanOrchestratorInstaller } from "./managed-plan-orchestrator-installer";
import { isLegacyManagedPlanCliShimRemoved } from "./managed-plan-orchestrator-shim-source";
import { createManagedWorkspacePaths } from "./managed-workspace-paths";

const createWorkspaceRoot = (): Promise<string> =>
  mkdtemp(path.join(os.tmpdir(), "app-skeleton-shim-disabled-"));

const exists = async (absolutePath: string): Promise<boolean> => {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
};

test("Application Skeleton generated plan shim source remains disabled", () => {
  assert.equal(isLegacyManagedPlanCliShimRemoved(), true);
});

test("Application Skeleton install path does not materialize a generated shim", async () => {
  const workspaceRoot = await createWorkspaceRoot();
  try {
    const paths = createManagedWorkspacePaths(workspaceRoot);
    const result = await new ManagedPlanOrchestratorInstaller().install(
      workspaceRoot,
      { initialStage: "application_skeleton" }
    );

    assert.equal(result.todoPlanCreated, true);
    assert.deepEqual(result.hooksWritten, []);
    assert.deepEqual(result.packageScripts, []);
    assert.equal(await exists(paths.planCommandDirectory.absolutePath), false);
    assert.equal(await exists(paths.hookDirectory.absolutePath), false);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
