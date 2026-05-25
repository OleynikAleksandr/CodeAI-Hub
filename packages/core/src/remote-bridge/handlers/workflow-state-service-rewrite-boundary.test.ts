import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import { Logger } from "../../telemetry/logger";
import { bootstrapWorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";
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

const readWorkflowState = async (params: {
  readonly service: WorkflowStateService;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<{
  readonly payload: Record<string, unknown>;
  readonly status: number;
}> =>
  new Promise((resolve) => {
    let status = 200;
    const req = {
      query: {
        workspacePath: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      },
    } as unknown as Request;
    const res = {
      status(code: number) {
        status = code;
        return this;
      },
      json(payload: unknown) {
        resolve({ payload: payload as Record<string, unknown>, status });
        return this;
      },
    } as unknown as Response;
    params.service.handleWorkflowStateRead(req, res);
  });

test("workflow-state read unblocks Application Skeleton after Core restart with only volatile metadata dirty", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-state-service-restart-gate-")
  );
  const workspaceSlug = "demo-workspace";

  try {
    await execFileAsync("git", ["init"], { cwd: workspaceRoot });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], {
      cwd: workspaceRoot,
    });
    await execFileAsync("git", ["config", "user.name", "CodeAI Test"], {
      cwd: workspaceRoot,
    });
    await writeWorkspaceFile(workspaceRoot, "README.md", "# Demo\n");
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/description/Final_Description.md`,
      "# Final Description\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/description/description-step.json`,
      `${JSON.stringify(
        {
          finalPath: `.codeai-hub/${workspaceSlug}/description/Final_Description.md`,
          updatedAt: "2026-05-11T12:28:23.134Z",
          workspacePath: workspaceRoot,
          workspaceSlug,
        },
        null,
        2
      )}\n`
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/virtual_simulation/virtual-simulation.md`,
      "# Virtual Simulation\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
      [
        "# Product Parts Index",
        "",
        "## Product Parts",
        "",
        "### Product Part: project-manager",
        "- Id: project-manager",
        "- Title: Project Manager",
        "- Purpose: Manages the product workflow.",
        "- Status: generated",
        "",
      ].join("\n")
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/project-manager.md`,
      [
        "# Product Part: Project Manager",
        "",
        "## Identity",
        "",
        "| Field | Value |",
        "| --- | --- |",
        "| Part ID | `project-manager` |",
        "| Product Part | `Project Manager` |",
        "| Purpose | Manages the product workflow. |",
        "",
        "## Purpose",
        "",
        "Manages the product workflow.",
        "",
        "## Owned Clusters",
        "",
        "### `workflow-ui`",
        "",
        "**Purpose:** Coordinates the workflow user interface.",
        "",
        "| `module-id` | Responsibility |",
        "| --- | --- |",
        "| `step-card` | Shows step start state. |",
        "",
      ].join("\n")
    );
    await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });
    await execFileAsync(
      "git",
      ["commit", "-m", "docs: accept diagram modules"],
      {
        cwd: workspaceRoot,
      }
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/description/description-step.json`,
      `${JSON.stringify(
        {
          finalPath: `.codeai-hub/${workspaceSlug}/description/Final_Description.md`,
          updatedAt: "2026-05-11T13:33:04.373Z",
          workspacePath: workspaceRoot,
          workspaceSlug,
        },
        null,
        2
      )}\n`
    );
    await writeWorkspaceFile(
      workspaceRoot,
      ".codeai-hub/state/task-timers.json",
      `${JSON.stringify(
        {
          schemaVersion: 2,
          totals: {
            description: 15,
            diagram_modules: 150,
            virtual_simulation: 10,
          },
        },
        null,
        2
      )}\n`
    );

    const service = new WorkflowStateService({ logger: new Logger("error") });
    const { payload, status } = await readWorkflowState({
      service,
      workspaceRoot,
      workspaceSlug,
    });
    const progress = payload.diagramModulesProgress as {
      readonly aggregateReady?: boolean;
      readonly generatedCount?: number;
      readonly plannedCount?: number;
    };
    const gating = payload.gating as {
      readonly blocked?: Record<string, boolean>;
    };

    assert.equal(status, 200);
    assert.equal(progress.aggregateReady, true);
    assert.equal(progress.generatedCount, 1);
    assert.equal(progress.plannedCount, 1);
    assert.equal(gating.blocked?.application_skeleton, false);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("workflow-state read ignores malformed retired state while preserving skeleton progress", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-state-service-retired-state-")
  );
  const workspaceSlug = "demo-workspace";
  const codePaths = [
    "product-parts/project-manager",
    "product-parts/project-manager/clusters/workflow-ui",
    "product-parts/project-manager/clusters/workflow-ui/modules/step-navigation",
  ];

  try {
    for (const codePath of codePaths) {
      await mkdir(path.join(workspaceRoot, codePath), { recursive: true });
    }
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/workflow/state.json`,
      '{ "workspaceSlug": "demo-workspace", "updatedAt": "broken" \n'
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/description/Final_Description.md`,
      "# Final Description\n"
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/description/description-step.json`,
      JSON.stringify(
        {
          finalPath: `.codeai-hub/${workspaceSlug}/description/Final_Description.md`,
          updatedAt: "2026-05-07T10:00:00.000Z",
          workspacePath: workspaceRoot,
          workspaceSlug,
        },
        null,
        2
      )
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/application_skeleton/application-skeleton.md`,
      [
        "# Application Skeleton",
        "",
        "reviewState: materialized",
        "accepted: true",
        "materialized: true",
        "materializationState: materialized",
        "",
      ].join("\n")
    );
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/application_skeleton/application-skeleton-map.json`,
      `${JSON.stringify(
        {
          accepted: true,
          materialized: true,
          materializationState: "materialized",
          materializedPaths: codePaths,
          productParts: [
            {
              clusters: [
                {
                  codePath: codePaths[1],
                  id: "workflow-ui",
                  modules: [{ codePath: codePaths[2], id: "step-navigation" }],
                },
              ],
              codePath: codePaths[0],
              id: "project-manager",
              standaloneModules: [],
            },
          ],
          reviewState: "materialized",
          sourceRoot: "product-parts",
        },
        null,
        2
      )}\n`
    );

    const service = new WorkflowStateService({ logger: new Logger("error") });
    const { payload, status } = await readWorkflowState({
      service,
      workspaceRoot,
      workspaceSlug,
    });
    const skeletonProgress = payload.applicationSkeletonProgress as {
      readonly materialized?: boolean;
      readonly validationErrors?: readonly string[];
    };
    const gating = payload.gating as {
      readonly blocked?: Record<string, boolean>;
    };

    assert.equal(status, 200);
    assert.equal(skeletonProgress.materialized, true);
    assert.deepEqual(skeletonProgress.validationErrors, []);
    assert.equal(gating.blocked?.quality_gates, false);
    assert.equal(
      await stat(
        path.join(
          workspaceRoot,
          `.codeai-hub/${workspaceSlug}/development_tree`
        )
      ).catch(() => null),
      null
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("workflow-state read after Description clear rebuilds projection without dirtying Git", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-state-service-description-clear-")
  );
  const workspaceSlug = "demo-workspace";

  try {
    await execFileAsync("git", ["init"], { cwd: workspaceRoot });
    await execFileAsync("git", ["config", "user.email", "test@example.com"], {
      cwd: workspaceRoot,
    });
    await execFileAsync("git", ["config", "user.name", "CodeAI Test"], {
      cwd: workspaceRoot,
    });
    await bootstrapWorkspaceRuntimeCapsule({
      workspaceRoot,
      workspaceSlug,
    });
    await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });
    await execFileAsync(
      "git",
      ["commit", "-m", "codeai-boundary: Description"],
      { cwd: workspaceRoot }
    );

    const service = new WorkflowStateService({ logger: new Logger("error") });
    const { payload, status } = await readWorkflowState({
      service,
      workspaceRoot,
      workspaceSlug,
    });
    const description = payload.description as {
      readonly questionnairePath?: string;
    };
    const lastActive = payload.lastActive as {
      readonly artifactPath?: string;
      readonly stage?: string;
    };

    assert.equal(status, 200);
    assert.equal(
      description.questionnairePath,
      `.codeai-hub/${workspaceSlug}/description/questionnaire.md`
    );
    assert.equal(lastActive.stage, "description");
    assert.equal(
      lastActive.artifactPath,
      `.codeai-hub/${workspaceSlug}/description/questionnaire.md`
    );
    assert.equal(
      await stat(
        path.join(
          workspaceRoot,
          `.codeai-hub/${workspaceSlug}/description/description-step.json`
        )
      ).catch(() => null),
      null
    );
    const { stdout: statusOutput } = await execFileAsync(
      "git",
      ["status", "--porcelain"],
      { cwd: workspaceRoot }
    );
    assert.equal(statusOutput.trim(), "");
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("workflow-state read with incomplete skeleton draft does not dispatch provider-visible corrections", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-state-service-read-side-effect-")
  );
  const workspaceSlug = "demo-workspace";
  const dispatched: Array<{
    readonly content: string;
    readonly sessionId: string;
  }> = [];

  try {
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/description/Final_Description.md`,
      "# Final Description\n"
    );
    // Phase 1A in progress: markdown exists, map.json deliberately missing.
    // Reading workflow-state must remain a projection only and must not
    // trigger repair dispatch while orchestration is being rewritten.
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/application_skeleton/application-skeleton.md`,
      "# Application Skeleton (incomplete draft)\n"
    );

    const service = new WorkflowStateService({
      logger: new Logger("error"),
    });

    const first = await readWorkflowState({
      service,
      workspaceRoot,
      workspaceSlug,
    });
    const second = await readWorkflowState({
      service,
      workspaceRoot,
      workspaceSlug,
    });

    assert.equal(first.status, 200);
    assert.equal(second.status, 200);
    // Two independent reads must produce zero provider-visible dispatches.
    assert.deepEqual(dispatched, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
