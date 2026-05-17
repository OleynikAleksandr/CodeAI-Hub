import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { Request, Response } from "express";
import {
  ManagedWorkflowPlanStore,
  ManagedWorkflowReadModelProjector,
} from "../../managed-workflow-orchestration";
import { ContinuityChainStore } from "../../session-continuity/continuity-store";
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

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const readStageStatuses = (
  payload: Record<string, unknown>
): Record<string, { readonly status?: string }> => {
  const state = payload.state as {
    readonly stages?: Record<string, { readonly status?: string }>;
  };
  return state.stages ?? {};
};

const writeManagedWorkspacePlan = async (
  workspaceRoot: string,
  completedStages: readonly string[]
): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    "doc/TODO/workspace.plan.md",
    [
      "# Managed Workspace Plan",
      "",
      "<!-- codeai-workspace-plan-state:start -->",
      "```json",
      JSON.stringify(
        {
          schema: "codeai-workspace-plan-v1",
          executionScopeStatus: "ACTIVE",
          completedStages,
        },
        null,
        2
      ),
      "```",
      "<!-- codeai-workspace-plan-state:end -->",
      "",
    ].join("\n")
  );
};

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
        "managed_dispatch",
        "managed_dispatch",
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

test("workflow-state promotes active Application Skeleton continuity to in-progress", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "managed-workflow-application-continuity-")
  );
  const workspaceSlug = "demo-workspace";
  try {
    const store = new ContinuityChainStore({
      clock: () => "2026-05-16T09:20:00.000Z",
      rootSessionId: "application-skeleton-session",
      stage: "application_skeleton",
      workspaceRoot,
      workspaceSlug,
    });
    await store.appendSegment({
      createdAt: "2026-05-16T09:20:00.000Z",
      providerId: "codexCli",
      providerSessionId: "codex-provider-session",
      sessionId: "application-skeleton-session",
    });

    const service = new WorkflowStateService({ logger: new Logger("error") });
    const payload = await readWorkflowState({
      service,
      workspaceRoot,
      workspaceSlug,
    });
    const state = payload.state as {
      readonly stages?: {
        readonly application_skeleton?: { readonly status?: string };
      };
    };

    assert.equal(state.stages?.application_skeleton?.status, "in_progress");
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("workflow-state restores yellow markers from persisted continuity after Core restart", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "managed-workflow-marker-continuity-")
  );
  const workspaceSlug = "demo-workspace";
  const stages = [
    "description",
    "virtual_simulation",
    "diagram_modules",
    "application_skeleton",
    "quality_gates",
  ] as const;

  try {
    for (const stage of stages) {
      const store = new ContinuityChainStore({
        clock: () => "2026-05-17T09:00:00.000Z",
        rootSessionId: `${stage}-session`,
        stage,
        workspaceRoot,
        workspaceSlug,
      });
      await store.appendSegment({
        createdAt: "2026-05-17T09:00:00.000Z",
        providerId: "codexCli",
        providerSessionId: `${stage}-provider-session`,
        sessionId: `${stage}-session`,
      });
    }

    const service = new WorkflowStateService({ logger: new Logger("error") });
    const payload = await readWorkflowState({
      service,
      workspaceRoot,
      workspaceSlug,
    });
    const restoredStages = readStageStatuses(payload);

    for (const stage of stages) {
      assert.equal(restoredStages[stage]?.status, "in_progress");
    }
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("workflow-state restores green managed markers from completed workspace ledger after Core restart", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "managed-workflow-marker-ledger-")
  );
  const workspaceSlug = "demo-workspace";
  const managedStages = [
    "diagram_modules",
    "application_skeleton",
    "quality_gates",
  ] as const;

  try {
    await writeManagedWorkspacePlan(workspaceRoot, managedStages);

    const service = new WorkflowStateService({ logger: new Logger("error") });
    const payload = await readWorkflowState({
      service,
      workspaceRoot,
      workspaceSlug,
    });
    const restoredStages = readStageStatuses(payload);

    for (const stage of managedStages) {
      assert.equal(restoredStages[stage]?.status, "completed");
    }
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
