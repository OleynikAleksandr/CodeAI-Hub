import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
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

const createProductPartMarkdown = (partId: string): string =>
  [
    `# Product Part: ${partId}`,
    "",
    "## Identity",
    "",
    "| Field | Value |",
    "| ----- | ----- |",
    `| Part ID | \`${partId}\` |`,
    `| Product Part | \`${partId}\` |`,
    `| Purpose | Planned ${partId}. |`,
    "",
    "## Purpose",
    "",
    `Planned ${partId}.`,
    "",
    "## Owned Clusters",
    "",
    "## Standalone Modules",
    "",
    "| `module-id` | Responsibility |",
    "| --- | --- |",
    `| \`${partId}-module\` | Implements ${partId}. |`,
    "",
  ].join("\n");

interface WorkflowStageArtifacts {
  readonly artifacts?: readonly { readonly path: string }[];
  readonly gates?: readonly { readonly gateId: string }[];
  readonly status: string;
}

interface DiagramModulesProgressPayload {
  readonly aggregateReady: boolean;
  readonly currentPartId?: string;
  readonly generatedCount: number;
  readonly plannedCount: number;
  readonly substep: string;
}

interface DevelopmentTreePayload {
  readonly parts: readonly {
    readonly clusters: readonly {
      readonly id: string;
      readonly modules: readonly { readonly id: string }[];
    }[];
    readonly id: string;
    readonly standaloneModules: readonly { readonly id: string }[];
    readonly status: string;
  }[];
}

interface WorkflowStatePayload {
  readonly developmentTree?: DevelopmentTreePayload;
  readonly diagramModulesProgress?: DiagramModulesProgressPayload | null;
  readonly gating: { readonly blocked: Record<string, boolean> };
  readonly lastActive?: {
    readonly artifactPath?: string;
    readonly stage: string;
    readonly updatedAt: string;
  } | null;
  readonly state?: { readonly stages: Record<string, WorkflowStageArtifacts> };
}

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

test("workflow-state cold start keeps development tree preview side-effect free before technical root gates", async () => {
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
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
      createProductPartsIndex(["local-core-runtime"])
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/local-core-runtime.md`,
      createProductPartMarkdown("local-core-runtime")
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/continuity/diagram_modules/diagram-root/chain.json`,
      `${JSON.stringify(
        {
          rootSessionId: "diagram-root",
          workspaceSlug,
          stage: "diagram_modules",
          segments: [
            {
              sessionId: "diagram-session",
              providerId: "codexCli",
              providerSessionId: "codex-provider-session",
              createdAt: "2026-05-05T06:00:00.000Z",
            },
          ],
          updatedAt: "2026-05-05T06:01:00.000Z",
        },
        null,
        2
      )}\n`
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

    assert.equal(payload.state?.stages.diagram_modules?.status, "in_progress");
    assert.equal(payload.diagramModulesProgress?.substep, "awaiting_review");
    assert.equal(payload.developmentTree?.parts.length, 1);
    assert.equal(payload.developmentTree?.parts[0]?.id, "local-core-runtime");
    assert.equal(payload.developmentTree?.parts[0]?.status, "materialized");
    assert.deepEqual(
      payload.developmentTree?.parts[0]?.standaloneModules.map(
        (module) => module.id
      ),
      ["local-core-runtime-module"]
    );
    assert.equal(
      await stat(
        path.join(
          workspaceRoot,
          ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/local-core-runtime"
        )
      ).catch(() => null),
      null
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("workflow-state keeps diagram modules in progress until managed completion ledger", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-state-service-diagram-review-")
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
      "# Virtual Simulation: Demo Workspace\n\n## Scenario 1\nReady.\n\n## Scenario 2\nReady.\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
      createProductPartsIndex(["local-core-runtime"])
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/local-core-runtime.md`,
      createProductPartMarkdown("local-core-runtime")
    );
    const service = new WorkflowStateService({ logger: new Logger("error") });
    service.record({
      stage: "diagram_modules",
      timestamp: "2026-05-16T06:30:00.000Z",
      type: "workflow.run.created",
      workspaceSlug,
    });
    const result = await readWorkflowStatePayload({
      service,
      workspaceRoot,
      workspaceSlug,
    });

    assert.equal(result.statusCode, 200);
    const payload = result.payload as WorkflowStatePayload;

    assert.equal(payload.diagramModulesProgress?.aggregateReady, true);
    assert.equal(payload.state?.stages.diagram_modules?.status, "in_progress");
    assert.equal(payload.gating.blocked.application_skeleton, false);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("workflow-state tracks diagram modules progress when not all product parts are ready", async () => {
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
    assert.equal(payload.state?.stages.diagram_modules?.status, "in_progress");
    assert.equal(payload.lastActive?.stage, "description");
    assert.equal(
      payload.lastActive?.artifactPath,
      ".codeai-hub/demo-workspace/description/Final_Description.md"
    );
    assert.equal(
      payload.diagramModulesProgress?.substep,
      "generate_product_part"
    );
    assert.equal(payload.diagramModulesProgress?.plannedCount, 2);
    assert.equal(payload.diagramModulesProgress?.generatedCount, 0);
    assert.equal(
      payload.diagramModulesProgress?.currentPartId,
      "local-core-runtime"
    );
    assert.equal(payload.diagramModulesProgress?.aggregateReady, false);
    assert.deepEqual(
      payload.developmentTree?.parts.map((part) => ({
        id: part.id,
        status: part.status,
      })),
      [
        { id: "local-core-runtime", status: "skeleton" },
        { id: "project-manager", status: "skeleton" },
      ]
    );
    assert.equal(
      await stat(
        path.join(
          workspaceRoot,
          ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/project-manager"
        )
      ).catch(() => null),
      null
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("workflow-state cold start does not complete diagram modules when index has no valid product part ids", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-state-service-empty-product-parts-")
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
      ].join("\n")
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
      ["# Product Parts Index", "", "## Product Parts", ""].join("\n")
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

    assert.equal(payload.state?.stages.diagram_modules?.status, "in_progress");
    assert.equal(payload.diagramModulesProgress?.substep, "index");
    assert.equal(payload.diagramModulesProgress?.plannedCount, 0);
    assert.equal(payload.diagramModulesProgress?.generatedCount, 0);
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
      "# Virtual Simulation: Demo Workspace\n"
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

    assert.equal(payload.state?.stages.virtual_simulation?.status, "invalid");
    assert.equal(payload.gating.blocked.diagram_modules, false);
    assert.equal(payload.lastActive?.stage, "description");
    assert.equal(
      payload.lastActive?.artifactPath,
      ".codeai-hub/demo-workspace/description/Final_Description.md"
    );
    assert.equal(
      payload.state?.stages.virtual_simulation?.gates?.some(
        (gate) => gate.gateId === "virtual-simulation.validation"
      ),
      true
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
