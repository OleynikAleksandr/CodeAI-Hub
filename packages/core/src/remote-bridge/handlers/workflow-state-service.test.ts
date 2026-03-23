import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { Request, Response } from "express";
import { Logger } from "../../telemetry/logger";
import { WorkflowStateService } from "./workflow-state-service";

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const createDescriptionStepJson = (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): string =>
  JSON.stringify(
    {
      workspaceSlug: params.workspaceSlug,
      workspacePath: params.workspaceRoot,
      createdAt: "2026-03-18T11:30:00.000Z",
      updatedAt: "2026-03-18T11:30:00.000Z",
      finalPath: `.codeai-hub/${params.workspaceSlug}/description/Final_Description.md`,
    },
    null,
    2
  );

const createProductPartsIndex = (partIds: readonly string[]): string =>
  [
    "# Product Parts Index",
    "",
    ...partIds.flatMap((partId) => [
      `### Product Part: ${partId}`,
      `- Title: ${partId}`,
      `- Purpose: Planned ${partId}.`,
      "",
    ]),
  ].join("\n");

type WorkflowStageArtifacts = {
  readonly status: string;
  readonly artifacts?: readonly { readonly path: string }[];
  readonly gates?: readonly { readonly gateId: string }[];
};

type DiagramModulesProgressPayload = {
  readonly substep: string;
  readonly plannedCount: number;
  readonly generatedCount: number;
  readonly currentPartId?: string;
  readonly aggregateReady: boolean;
};

type WorkflowStatePayload = {
  readonly state?: { readonly stages: Record<string, WorkflowStageArtifacts> };
  readonly gating: { readonly blocked: Record<string, boolean> };
  readonly diagramModulesProgress?: DiagramModulesProgressPayload | null;
};

const readWorkflowStatePayload = async (params: {
  readonly service: WorkflowStateService;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<{ readonly statusCode: number; readonly payload: unknown }> =>
  new Promise((resolve) => {
    let statusCode = 200;
    const req = {
      query: {
        workspaceSlug: params.workspaceSlug,
        workspacePath: params.workspaceRoot,
      },
    } as unknown as Request;
    const res = {
      status(code: number) {
        statusCode = code;
        return this;
      },
      json(payload: unknown) {
        resolve({ statusCode, payload });
        return this;
      },
    } as unknown as Response;
    params.service.handleWorkflowStateRead(req, res);
  });

test("workflow-state cold start hydrates existing canonical artifacts for downstream gating", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-state-service-hydration-")
  );
  const workspaceSlug = "demo-workspace";

  try {
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/description/Final_Description.md`,
      "# Final Description\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/description/description-step.json`,
      `${createDescriptionStepJson({ workspaceRoot, workspaceSlug })}\n`
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/virtual_simulation/virtual-simulation.md`,
      [
        "# Virtual Simulation: Demo Workspace",
        "",
        "## Сценарий 1",
        "Первый сценарий.",
        "",
        "## Сценарий 2",
        "Второй сценарий.",
        "",
      ].join("\n")
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/module-inventory.md`,
      "# Module Inventory\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
      createProductPartsIndex(["local-core-runtime"])
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/local-core-runtime.md`,
      "# Partial Product Part\n"
    );

    const service = new WorkflowStateService({
      logger: new Logger("error"),
    });
    const result = await readWorkflowStatePayload({
      service,
      workspaceRoot,
      workspaceSlug,
    });

    assert.equal(result.statusCode, 200);
    const payload = result.payload as WorkflowStatePayload;

    assert.equal(payload.state.stages.virtual_simulation?.status, "completed");
    assert.equal(payload.state.stages.diagram_modules?.status, "completed");
    assert.equal(payload.gating.blocked.diagram_modules, false);
    assert.equal(payload.gating.blocked.diagram_facades, false);
    assert.equal(payload.diagramModulesProgress?.substep, "awaiting_review");
    assert.equal(payload.diagramModulesProgress?.plannedCount, 1);
    assert.equal(payload.diagramModulesProgress?.generatedCount, 1);
    assert.equal(payload.diagramModulesProgress?.aggregateReady, true);
    assert.equal(
      payload.state.stages.virtual_simulation?.artifacts.some(
        (artifact) =>
          artifact.path === "virtual_simulation/virtual-simulation.md"
      ),
      true
    );
    assert.equal(
      payload.state.stages.diagram_modules?.artifacts.some(
        (artifact) => artifact.path === "diagram_modules/module-inventory.md"
      ),
      true
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("workflow-state keeps diagram facades blocked until all product parts and aggregate are ready", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-state-service-product-parts-")
  );
  const workspaceSlug = "demo-workspace";

  try {
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/description/Final_Description.md`,
      "# Final Description\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/description/description-step.json`,
      `${createDescriptionStepJson({ workspaceRoot, workspaceSlug })}\n`
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/virtual_simulation/virtual-simulation.md`,
      [
        "# Virtual Simulation: Demo Workspace",
        "",
        "## Сценарий 1",
        "Первый сценарий.",
        "",
        "## Сценарий 2",
        "Второй сценарий.",
      ].join("\n")
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
      createProductPartsIndex(["local-core-runtime", "project-manager"])
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/local-core-runtime.md`,
      "# Partial Product Part\n"
    );

    const service = new WorkflowStateService({
      logger: new Logger("error"),
    });
    const result = await readWorkflowStatePayload({
      service,
      workspaceRoot,
      workspaceSlug,
    });

    assert.equal(result.statusCode, 200);
    const payload = result.payload as WorkflowStatePayload;

    assert.equal(payload.gating.blocked.diagram_modules, false);
    assert.equal(payload.gating.blocked.diagram_facades, true);
    assert.equal(
      payload.diagramModulesProgress?.substep,
      "generate_product_part"
    );
    assert.equal(payload.diagramModulesProgress?.plannedCount, 2);
    assert.equal(payload.diagramModulesProgress?.generatedCount, 1);
    assert.equal(
      payload.diagramModulesProgress?.currentPartId,
      "project-manager"
    );
    assert.equal(payload.diagramModulesProgress?.aggregateReady, false);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("workflow-state cold start keeps invalid status but still unlocks diagram modules when artifact exists", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-state-service-invalid-vs-")
  );
  const workspaceSlug = "demo-workspace";

  try {
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/description/Final_Description.md`,
      "# Final Description\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/description/description-step.json`,
      `${createDescriptionStepJson({ workspaceRoot, workspaceSlug })}\n`
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/virtual_simulation/virtual-simulation.md`,
      "# Virtual Simulation: Demo Workspace\n\n## Сценарий 1\nТолько один сценарий.\n"
    );

    const service = new WorkflowStateService({
      logger: new Logger("error"),
    });
    const result = await readWorkflowStatePayload({
      service,
      workspaceRoot,
      workspaceSlug,
    });

    assert.equal(result.statusCode, 200);
    const payload = result.payload as WorkflowStatePayload;

    assert.equal(payload.state.stages.virtual_simulation?.status, "invalid");
    assert.equal(payload.gating.blocked.diagram_modules, false);
    assert.equal(payload.gating.blocked.diagram_facades, true);
    assert.equal(
      payload.state.stages.virtual_simulation?.gates.some(
        (gate) => gate.gateId === "virtual-simulation.validation"
      ),
      true
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
