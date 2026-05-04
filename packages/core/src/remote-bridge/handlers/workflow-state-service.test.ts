import assert from "node:assert/strict";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { Request, Response } from "express";
import { Logger } from "../../telemetry/logger";
import { WorkflowStateService } from "./workflow-state-service";

const AGENT_FILL_MARKER_PATTERN = /<!-- agent-fill -->/;
const DEVELOPMENT_TREE_STAGE_PATTERN = /^development-tree\./;
const TECHNOLOGY_BASE_QUESTION_PATTERN = /Technology base: unknown/;

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

test("workflow-state cold start unlocks foundation envelope after diagram modules aggregate readiness", async () => {
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
    const createdSessions: Array<{
      readonly context: {
        readonly initiativeSlug: string;
        readonly runSlug?: string | null;
        readonly stage: string;
      };
      readonly providerId: string;
      readonly workspacePath: string;
    }> = [];
    const sentMessages: Array<{
      readonly content: string;
      readonly sessionId: string;
    }> = [];
    const service = new WorkflowStateService({
      logger: new Logger("error"),
      developmentTreeAgentSessions: {
        providerId: "codexCli",
        gateway: {
          createSessionForWorkflow: (options) => {
            createdSessions.push(options);
            return Promise.resolve({ id: `session-${createdSessions.length}` });
          },
          handleMessage: (sessionId, content) => {
            sentMessages.push({ sessionId, content });
            return Promise.resolve();
          },
        },
      },
    });
    const result = await readWorkflowStatePayload({
      service,
      workspaceRoot,
      workspaceSlug,
    });

    assert.equal(result.statusCode, 200);
    const payload = result.payload as WorkflowStatePayload;

    assert.equal(payload.state?.stages.virtual_simulation?.status, "completed");
    assert.equal(payload.state?.stages.diagram_modules?.status, "completed");
    assert.equal(payload.gating.blocked.diagram_modules, false);
    assert.equal(payload.lastActive?.stage, "description");
    assert.equal(
      payload.lastActive?.artifactPath,
      ".codeai-hub/demo-workspace/description/Final_Description.md"
    );
    assert.equal(payload.diagramModulesProgress?.substep, "awaiting_review");
    assert.equal(payload.diagramModulesProgress?.plannedCount, 1);
    assert.equal(payload.diagramModulesProgress?.generatedCount, 1);
    assert.equal(payload.diagramModulesProgress?.aggregateReady, true);
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
      (
        await stat(
          path.join(
            workspaceRoot,
            ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/local-core-runtime/modules/local-core-runtime-module"
          )
        )
      ).isDirectory(),
      true
    );
    const draftPath = path.join(
      workspaceRoot,
      ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/local-core-runtime/PartDescription.draft.md"
    );
    assert.match(await readFile(draftPath, "utf8"), AGENT_FILL_MARKER_PATTERN);
    assert.equal(createdSessions.length, 2);
    assert.equal(sentMessages.length, 2);
    assert.equal(createdSessions[0]?.providerId, "codexCli");
    assert.equal(createdSessions[0]?.workspacePath, workspaceRoot);
    assert.equal(createdSessions[0]?.context.initiativeSlug, workspaceSlug);
    assert.equal(createdSessions[0]?.context.runSlug, "development-tree");
    assert.match(
      createdSessions[0]?.context.stage ?? "",
      DEVELOPMENT_TREE_STAGE_PATTERN
    );
    assert.match(
      sentMessages[0]?.content ?? "",
      TECHNOLOGY_BASE_QUESTION_PATTERN
    );
    assert.equal(
      payload.state?.stages.virtual_simulation?.artifacts?.some(
        (artifact) =>
          artifact.path === "virtual_simulation/virtual-simulation.md"
      ),
      true
    );
    assert.equal(
      payload.state?.stages.diagram_modules?.artifacts?.some(
        (artifact) => artifact.path === "diagram_modules/product-parts.index.md"
      ),
      true
    );
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
