import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { Request, Response } from "express";
import {
  ManagedWorkflowPlanStore,
  ManagedWorkflowReadModelProjector,
} from "../../managed-workflow-orchestration";
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
      readonly readOnlyStages?: readonly string[];
      readonly stages?: readonly {
        readonly controllerId: string;
        readonly startPolicy: string;
      }[];
    };

    assert.equal(projection.active, true);
    assert.equal(projection.mode, "preview");
    assert.deepEqual(projection.readOnlyStages, []);
    assert.deepEqual(
      projection.stages?.map((stage) => stage.controllerId),
      [
        "description",
        "virtual_simulation",
        "diagram_modules",
        "application_skeleton",
        "quality_gates",
      ]
    );
    assert.deepEqual(
      projection.stages?.map((stage) => stage.startPolicy),
      [
        "provider_direct",
        "provider_direct",
        "managed_dispatch",
        "core_preview_boundary",
        "core_preview_boundary",
      ]
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("managed workflow read model projects a persisted Diagram Modules phase snapshot", () => {
  const store = new ManagedWorkflowPlanStore();
  store.appendStageStartSnapshot({
    recordedAt: "2026-05-15T12:00:00.000Z",
    recordId: "diagram-start",
    stageId: "diagram_modules",
    workspaceRoot: "/tmp/demo",
    workspaceSlug: "demo-workspace",
  });
  const snapshot = store.readLatestSnapshot({
    stageId: "diagram_modules",
    workspaceSlug: "demo-workspace",
  });
  const projection = new ManagedWorkflowReadModelProjector().project({
    currentSnapshots: snapshot ? [snapshot] : [],
  });
  const diagramStage = projection.stages.find(
    (stage) => stage.controllerId === "diagram_modules"
  );

  assert.equal(diagramStage?.startPolicy, "managed_dispatch");
  assert.equal(diagramStage?.runStatus, "core_gated");
  assert.equal(diagramStage?.currentPhase?.type, "core_gated");
  assert.equal(diagramStage?.currentPhase?.index, 1);
});

test("workflow-state projects managed read-only upstream stages from downstream technical progress", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "managed-workflow-readonly-")
  );
  try {
    const service = new WorkflowStateService({ logger: new Logger("error") });
    service.record({
      stage: "diagram_modules",
      timestamp: "2026-05-15T10:00:00.000Z",
      type: "workflow.run.created",
      workspaceSlug: "demo-workspace",
    });
    const payload = await readWorkflowState({
      service,
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });
    const projection = payload.managedWorkflowPreview as {
      readonly readOnlyStages?: readonly string[];
    };

    assert.deepEqual(projection.readOnlyStages, [
      "description",
      "virtual_simulation",
    ]);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
