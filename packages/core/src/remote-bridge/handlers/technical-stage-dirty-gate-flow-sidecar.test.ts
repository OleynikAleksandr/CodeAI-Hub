import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import { Logger } from "../../telemetry/logger";
import {
  attachTechnicalStageDirtyFiles,
  readTechnicalStageDirtyStatus,
} from "./technical-stage-dirty-gate";
import { WorkflowStateService } from "./workflow-state-service";

const execFileAsync = promisify(execFile);

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const initCommittedWorkspace = async (workspaceRoot: string): Promise<void> => {
  await execFileAsync("git", ["init"], { cwd: workspaceRoot });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], {
    cwd: workspaceRoot,
  });
  await execFileAsync("git", ["config", "user.name", "CodeAI Test"], {
    cwd: workspaceRoot,
  });
  await writeWorkspaceFile(workspaceRoot, "README.md", "# Demo\n");
  await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });
  await execFileAsync("git", ["commit", "-m", "test: initial"], {
    cwd: workspaceRoot,
  });
};

const createDescriptionStepJson = (params: {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): string =>
  JSON.stringify(
    {
      workspaceSlug: params.workspaceSlug,
      workspacePath: params.workspaceRoot,
      createdAt: "2026-05-16T06:30:00.000Z",
      updatedAt: "2026-05-16T06:30:00.000Z",
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
      "- Status: generated",
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
    "### `runtime-core`",
    "",
    "**Purpose:** Coordinates runtime execution.",
    "",
    "| `module-id` | Responsibility |",
    "| --- | --- |",
    `| \`${partId}-module\` | Implements ${partId}. |`,
    "",
  ].join("\n");

interface WorkflowStatePayload {
  readonly diagramModulesProgress?: { readonly aggregateReady: boolean } | null;
  readonly gating: { readonly blocked: Record<string, boolean> };
  readonly state?: {
    readonly stages: Record<string, { readonly status: string }>;
  };
}

const readWorkflowStatePayload = async (params: {
  readonly service: WorkflowStateService;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<WorkflowStatePayload> =>
  new Promise((resolve) => {
    const req = {
      query: {
        workspacePath: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      },
    } as unknown as Request;
    const res = {
      status() {
        return this;
      },
      json(payload: unknown) {
        resolve(payload as WorkflowStatePayload);
        return this;
      },
    } as Response;
    params.service.handleWorkflowStateRead(req, res);
  });

test("Diagram Modules flow sidecar does not reset aggregate readiness", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagram-flow-sidecar-dirty-gate-")
  );
  const workspaceSlug = "demo";

  try {
    await initCommittedWorkspace(workspaceRoot);
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/module-map.flow.json`,
      `${JSON.stringify({ nodes: [], edges: [] }, null, 2)}\n`
    );

    const status = await readTechnicalStageDirtyStatus(
      workspaceRoot,
      workspaceSlug
    );
    const progress = attachTechnicalStageDirtyFiles(
      { aggregateReady: true },
      status.dirtyByStage.diagram_modules
    );

    assert.equal(status.clean, true);
    assert.deepEqual(status.dirtyByStage.diagram_modules, []);
    assert.deepEqual(progress, { aggregateReady: true });
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Workflow state keeps Diagram Modules completed with untracked flow sidecar", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "diagram-flow-sidecar-workflow-state-")
  );
  const workspaceSlug = "demo";

  try {
    await initCommittedWorkspace(workspaceRoot);
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
      "# Virtual Simulation\n\n## Scenario 1\nReady.\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
      createProductPartsIndex(["core-runtime"])
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/core-runtime.md`,
      createProductPartMarkdown("core-runtime")
    );
    await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });
    await execFileAsync("git", ["commit", "-m", "docs: materialize diagrams"], {
      cwd: workspaceRoot,
    });
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/module-map.flow.json`,
      `${JSON.stringify({ nodes: [], edges: [] }, null, 2)}\n`
    );

    const service = new WorkflowStateService({ logger: new Logger("error") });
    service.record({
      stage: "diagram_modules",
      timestamp: "2026-05-16T06:30:00.000Z",
      type: "workflow.run.created",
      workspaceSlug,
    });

    const payload = await readWorkflowStatePayload({
      service,
      workspaceRoot,
      workspaceSlug,
    });

    assert.equal(payload.diagramModulesProgress?.aggregateReady, true);
    assert.equal(payload.state?.stages.diagram_modules?.status, "completed");
    assert.equal(payload.gating.blocked.application_skeleton, false);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
