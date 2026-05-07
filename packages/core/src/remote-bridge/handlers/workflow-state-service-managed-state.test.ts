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

test("workflow-state read ignores malformed managed state while preserving skeleton progress", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-state-service-managed-")
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
