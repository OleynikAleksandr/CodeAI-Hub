import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import type { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import {
  type ManagedArbitrationRetryNotice,
  ManagedWorkflowPostTurnService,
} from "./managed-workflow-post-turn-service";
import { WorkflowStateService } from "./workflow-state-service";

const execFileAsync = promisify(execFile);
const RETRY_LIMIT_REASON_RE =
  /Managed arbitration exceeded the per-stage retry limit/u;

const initWorkspaceWithDirtyDiagramModules = async (
  workspaceRoot: string,
  workspaceSlug: string
): Promise<void> => {
  await execFileAsync("git", ["init"], { cwd: workspaceRoot });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], {
    cwd: workspaceRoot,
  });
  await execFileAsync("git", ["config", "user.name", "CodeAI Test"], {
    cwd: workspaceRoot,
  });
  await writeFile(path.join(workspaceRoot, "README.md"), "# Demo\n", "utf8");
  await execFileAsync("git", ["add", "README.md"], { cwd: workspaceRoot });
  await execFileAsync("git", ["commit", "-m", "test: initial"], {
    cwd: workspaceRoot,
  });
  const dirtyPath = path.join(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`
  );
  await mkdir(path.dirname(dirtyPath), { recursive: true });
  await writeFile(dirtyPath, "# Product Parts\n", "utf8");
};

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
    // Phase 1A in progress: markdown exists, map.json deliberately missing —
    // a real Phase 1A guard would emit a repair decision, but only on the
    // post-turn path. Reading workflow-state must NOT trigger that dispatch.
    await writeWorkspaceFile(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/application_skeleton/application-skeleton.md`,
      "# Application Skeleton (incomplete draft)\n"
    );

    const service = new WorkflowStateService({
      developmentTreeAgentSessions: {
        gateway: {
          handleMessage: (sessionId, content) => {
            dispatched.push({
              content: typeof content === "string" ? content : "payload",
              sessionId,
            });
            return Promise.resolve();
          },
        },
        providerId: "codexCli",
      },
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
    // Two independent reads must produce zero provider-visible dispatches —
    // read-model paths are side-effect free until the post-turn boundary.
    assert.deepEqual(dispatched, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("ManagedWorkflowPostTurnService notifies retry-limit reached after dirty arbitration repeats", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "managed-arbitration-retry-")
  );
  const workspaceSlug = "demo-workspace";
  const notices: ManagedArbitrationRetryNotice[] = [];

  try {
    await initWorkspaceWithDirtyDiagramModules(workspaceRoot, workspaceSlug);
    const sessionManager = {
      getSession: () => ({
        id: "session-1",
        workspacePath: workspaceRoot,
        initiativeSlug: workspaceSlug,
        stage: "diagram_modules",
        providerId: "codexCli",
      }),
    } as unknown as SessionManager;

    const service = new ManagedWorkflowPostTurnService({
      logger: new Logger("error"),
      onRetryLimitReached: (notice) => {
        notices.push(notice);
      },
      retryLimit: 2,
      sessionManager,
    });

    for (let attempt = 0; attempt < 4; attempt += 1) {
      service.handle("session-1");
      await service.whenIdle("session-1");
    }

    assert.ok(
      notices.length >= 1,
      `Expected retry-limit notifier to fire; got ${notices.length}`
    );
    const firstNotice = notices[0];
    assert.equal(firstNotice?.sessionId, "session-1");
    assert.equal(firstNotice?.stage, "diagram_modules");
    assert.equal(firstNotice?.retryLimit, 2);
    assert.ok((firstNotice?.attempts ?? 0) > 2);
    assert.match(firstNotice?.reason ?? "", RETRY_LIMIT_REASON_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
