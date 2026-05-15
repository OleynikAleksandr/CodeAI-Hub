import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { Request, Response } from "express";
import { Logger } from "../../telemetry/logger";
import { WorkflowStateService } from "./workflow-state-service";

const readWorkflowState = async (params: {
  readonly service: WorkflowStateService;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<Record<string, unknown>> =>
  new Promise((resolve) => {
    const req = {
      query: {
        workspacePath: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      },
    } as unknown as Request;
    const res = {
      json(payload: unknown) {
        resolve(payload as Record<string, unknown>);
        return this;
      },
    } as unknown as Response;
    params.service.handleWorkflowStateRead(req, res);
  });

test("workflow-state projects managed workflow preview state read-only", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "managed-workflow-preview-")
  );
  try {
    const service = new WorkflowStateService({ logger: new Logger("error") });
    const payload = await readWorkflowState({
      service,
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });
    const projection = payload.managedWorkflowPreview as {
      readonly active?: boolean;
      readonly mode?: string;
      readonly stages?: readonly { readonly controllerId: string }[];
    };

    assert.equal(projection.active, true);
    assert.equal(projection.mode, "preview");
    assert.deepEqual(
      projection.stages?.map((stage) => stage.controllerId),
      ["diagram_modules", "application_skeleton", "quality_gates"]
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
