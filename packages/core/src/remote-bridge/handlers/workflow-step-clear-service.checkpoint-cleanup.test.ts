import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { Request, Response } from "express";
import { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import { WorkflowStepCheckpointFacade } from "../../workflow/step-checkpoint/workflow-step-checkpoint-facade";
import { handleWorkflowStepClear } from "./workflow-step-clear-service";

const exists = async (targetPath: string): Promise<boolean> =>
  Boolean(await stat(targetPath).catch(() => null));

const writeFileInWorkspace = async (
  workspaceRoot: string,
  relativePath: string,
  content = "test\n"
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const runClear = async (params: {
  readonly body: unknown;
  readonly resetCalls: string[];
  readonly sessionManager: SessionManager;
}): Promise<{ readonly payload: unknown; readonly statusCode: number }> => {
  let statusCode = 200;
  let payload: unknown = null;
  const response = {
    json(nextPayload: unknown) {
      payload = nextPayload;
      return this;
    },
    status(nextStatusCode: number) {
      statusCode = nextStatusCode;
      return this;
    },
  } as unknown as Response;
  await handleWorkflowStepClear({ body: params.body } as Request, response, {
    logger: new Logger("error"),
    resetWorkflowState: (workspaceSlug) =>
      params.resetCalls.push(workspaceSlug),
    sessionManager: params.sessionManager,
  });
  return { payload, statusCode };
};

test("workflow step clear removes downstream generated files even when checkpoint contains stale state", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-step-clear-checkpoint-cleanup-")
  );
  const workspaceSlug = "demo-workspace";
  const resetCalls: string[] = [];
  try {
    const virtualPath = `.codeai-hub/${workspaceSlug}/virtual_simulation/virtual-simulation.md`;
    const diagramPath = `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`;
    const devTreePath = `.codeai-hub/${workspaceSlug}/development_tree/materialized/product-parts/core/index.md`;
    const skeletonPath = `.codeai-hub/${workspaceSlug}/application_skeleton/application-skeleton-map.json`;
    const qualityPath = `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.md`;
    const diagramManagedPath = `.codeai-hub/${workspaceSlug}/workflow/managed/diagram_modules.json`;
    const skeletonManagedPath = `.codeai-hub/${workspaceSlug}/workflow/managed/application_skeleton.json`;
    const qualityManagedPath = `.codeai-hub/${workspaceSlug}/workflow/managed/quality_gates.json`;
    const productPartPath = "product-parts/core/index.ts";
    const developmentTodoPath =
      "doc/TODO/stages/development-tree/product-parts/core/todo-plan.md";
    for (const relativePath of [
      virtualPath,
      diagramPath,
      devTreePath,
      skeletonPath,
      qualityPath,
      diagramManagedPath,
      skeletonManagedPath,
      qualityManagedPath,
      productPartPath,
      developmentTodoPath,
    ]) {
      await writeFileInWorkspace(workspaceRoot, relativePath);
    }
    await new WorkflowStepCheckpointFacade({
      clock: () => "2026-05-24T09:00:00.000Z",
    }).ensureCheckpoint({
      stage: "virtual_simulation",
      workspaceRoot,
      workspaceSlug,
    });

    const result = await runClear({
      body: {
        workspacePath: workspaceRoot,
        workspaceSlug,
        target: { kind: "workflow_stage", stage: "virtual_simulation" },
      },
      resetCalls,
      sessionManager: new SessionManager(),
    });

    assert.equal(result.statusCode, 200);
    assert.equal(
      (result.payload as { readonly checkpointRestored?: unknown })
        .checkpointRestored,
      true
    );
    for (const relativePath of [
      virtualPath,
      diagramPath,
      devTreePath,
      skeletonPath,
      qualityPath,
      diagramManagedPath,
      skeletonManagedPath,
      qualityManagedPath,
      productPartPath,
      developmentTodoPath,
    ]) {
      assert.equal(await exists(path.join(workspaceRoot, relativePath)), false);
    }
    assert.deepEqual(resetCalls, [workspaceSlug]);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
