import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import type { Request, Response } from "express";
import { Logger } from "../../telemetry/logger";
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

const writeJsonFile = (
  workspaceRoot: string,
  relativePath: string,
  content: Record<string, unknown>
): Promise<void> =>
  writeWorkspaceFile(
    workspaceRoot,
    relativePath,
    `${JSON.stringify(content)}\n`
  );

const createProductPartsIndex = (): string =>
  [
    "# Product Parts Index",
    "",
    "### Product Part: local-runtime",
    "- Title: Local Runtime",
    "- Purpose: Runtime shell.",
    "",
  ].join("\n");

const createProductPart = (): string =>
  [
    "# Product Part: local-runtime",
    "",
    "## Identity",
    "",
    "| Field | Value |",
    "| ----- | ----- |",
    "| Part ID | `local-runtime` |",
    "",
    "## Owned Clusters",
    "",
    "## Standalone Modules",
    "",
    "| `module-id` | Responsibility |",
    "| --- | --- |",
    "| `provider-bridge` | Coordinates providers. |",
    "",
  ].join("\n");

const writeManagedPlanEvidence = async (
  workspaceRoot: string
): Promise<void> => {
  await writeJsonFile(workspaceRoot, "doc/TODO/workspace.plan.md", {});
  await writeWorkspaceFile(
    workspaceRoot,
    "doc/TODO/workspace.plan.md",
    [
      "# Managed Workspace Plan",
      "<!-- codeai-workspace-plan-state:start -->",
      "```json",
      JSON.stringify({
        acceptedCommits: [
          {
            commitHash: "def5678",
            message: "feat: materialize application skeleton",
            planPath: "doc/TODO/stages/application-skeleton/todo-plan.md",
            stage: "application_skeleton",
            taskId: "application-skeleton.phase3.materialize.task1",
          },
          {
            commitHash: "abc1234",
            message: "feat: integrate quality gates baseline",
            planPath: "doc/TODO/stages/quality-gates/todo-plan.md",
            stage: "quality_gates",
            taskId: "quality-gates.stream1.task2",
          },
        ],
        activePlanPath: "doc/TODO/stages/quality-gates/todo-plan.md",
        activeStage: "quality_gates",
        schema: "codeai-workspace-plan-v1",
      }),
      "```",
      "<!-- codeai-workspace-plan-state:end -->",
    ].join("\n")
  );
  for (const [planPath, currentTaskId] of [
    [
      "doc/TODO/stages/application-skeleton/todo-plan.md",
      "application-skeleton.handoff.task1",
    ],
    [
      "doc/TODO/stages/quality-gates/todo-plan.md",
      "quality-gates.stream1.task3",
    ],
  ] as const) {
    await writeWorkspaceFile(
      workspaceRoot,
      planPath,
      [
        "# Managed Workspace TODO Plan",
        "<!-- codeai-plan-state:start -->",
        "```json",
        JSON.stringify({
          currentTaskId,
          debt: null,
          executionScopeStatus: "ACTIVE",
          expectedCommitMessage: "feat: integrate quality gates baseline",
          schema: "codeai-plan-v1",
        }),
        "```",
        "<!-- codeai-plan-state:end -->",
      ].join("\n")
    );
  }
};

const writeTechnicalRootArtifacts = async (
  workspaceRoot: string,
  workspaceSlug: string
): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/description/Final_Description.md`,
    "# Final Description\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/virtual_simulation/virtual-simulation.md`,
    "# Virtual Simulation: Demo\n\n## Scenario\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
    createProductPartsIndex()
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/local-runtime.md`,
    createProductPart()
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/application_skeleton/application-skeleton.md`,
    [
      "# Application Skeleton",
      "",
      "| Field | Value |",
      "| --- | --- |",
      "| reviewState | `materialized` |",
      "| accepted | `true` |",
      "| materialized | `true` |",
      "| materializationState | `materialized` |",
      "",
    ].join("\n")
  );
  await writeJsonFile(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/application_skeleton/application-skeleton-map.json`,
    {
      accepted: true,
      materialized: true,
      materializationState: "materialized",
      materializedPaths: ["product-parts/local-runtime"],
      productParts: [
        { codePath: "product-parts/local-runtime", partId: "local-runtime" },
      ],
      reviewState: "materialized",
      schema: "codeai-application-skeleton-v1",
      sourceRoot: "product-parts",
    }
  );
  await writeWorkspaceFile(
    workspaceRoot,
    "product-parts/local-runtime/README.md",
    "# Local Runtime\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.md`,
    "# Quality Gates Baseline\n"
  );
  await writeJsonFile(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.json`,
    {
      accepted: true,
      commands: {
        "qg-secret-scan": { id: "qg-secret-scan" },
        "qg-smoke-checks": { id: "qg-smoke-checks" },
      },
      integrated: true,
      integrationState: "integrated",
      requiredBeforeCommit: ["qg-secret-scan"],
      requiredBeforePush: ["qg-smoke-checks"],
      schema: "codeai-quality-gates-v1",
    }
  );
  await writeWorkspaceFile(
    workspaceRoot,
    ".husky/pre-commit",
    "#!/bin/sh\nnpm run qg:secret-scan\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    ".husky/pre-push",
    "#!/bin/sh\nnpm run qg:smoke-checks\n"
  );
  await writeManagedPlanEvidence(workspaceRoot);
};

const writeStageContinuity = (
  workspaceRoot: string,
  workspaceSlug: string,
  stage: string,
  sessionId: string
): Promise<void> =>
  writeJsonFile(
    workspaceRoot,
    `.codeai-hub/${workspaceSlug}/continuity/${stage}/codex-${stage}/chain.json`,
    {
      dialogId: `codex-${stage}`,
      rootSessionId: `codex-${stage}`,
      segments: [
        {
          createdAt: "2026-05-08T05:51:54.053Z",
          providerId: "codexCli",
          providerSessionId: `provider-${sessionId}`,
          sessionId,
        },
      ],
      stage,
      updatedAt: "2026-05-08T05:51:54.053Z",
      workspaceSlug,
    }
  );

const commitWorkspace = async (workspaceRoot: string): Promise<void> => {
  await execFileAsync("git", ["init"], { cwd: workspaceRoot });
  await execFileAsync("git", ["config", "user.email", "test@example.com"], {
    cwd: workspaceRoot,
  });
  await execFileAsync("git", ["config", "user.name", "CodeAI Test"], {
    cwd: workspaceRoot,
  });
  await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });
  await execFileAsync("git", ["commit", "-m", "test: ready"], {
    cwd: workspaceRoot,
  });
};

const readWorkflowStatePayload = async (params: {
  readonly service: WorkflowStateService;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<unknown> =>
  new Promise((resolve) => {
    const req = {
      query: {
        workspacePath: params.workspaceRoot,
        workspaceSlug: params.workspaceSlug,
      },
    } as unknown as Request;
    const res = { json: (payload: unknown) => resolve(payload) } as Response;
    params.service.handleWorkflowStateRead(req, res);
  });

const readWorkflowStateTwice = async (params: {
  readonly service: WorkflowStateService;
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}): Promise<void> => {
  await readWorkflowStatePayload(params);
  await readWorkflowStatePayload(params);
};

const runFeedbackScenario = async (params: {
  readonly sessionId: string;
  readonly setup: (
    workspaceRoot: string,
    workspaceSlug: string
  ) => Promise<void>;
  readonly stage: string;
  readonly tmpPrefix: string;
}): Promise<void> => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), params.tmpPrefix));
  const workspaceSlug = "demo-workspace";
  const feedbackMessages: string[] = [];

  try {
    await writeTechnicalRootArtifacts(workspaceRoot, workspaceSlug);
    await writeStageContinuity(
      workspaceRoot,
      workspaceSlug,
      params.stage,
      params.sessionId
    );
    await params.setup(workspaceRoot, workspaceSlug);
    await commitWorkspace(workspaceRoot);

    const service = new WorkflowStateService({
      logger: new Logger("error"),
      developmentTreeAgentSessions: {
        gateway: {
          createSessionForWorkflow: () => Promise.resolve(null),
          handleMessage: (sessionId, content) => {
            feedbackMessages.push(`${sessionId}\n${content}`);
            return Promise.resolve();
          },
        },
        providerId: "codexCli",
      },
    });

    await readWorkflowStateTwice({ service, workspaceRoot, workspaceSlug });

    assert.deepEqual(feedbackMessages, []);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
};

test("workflow-state read unlocks development tree without node auto fan-out", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-state-development-tree-")
  );
  const workspaceSlug = "demo-workspace";
  const createdStages: string[] = [];

  try {
    await writeTechnicalRootArtifacts(workspaceRoot, workspaceSlug);
    await commitWorkspace(workspaceRoot);

    const createService = () =>
      new WorkflowStateService({
        logger: new Logger("error"),
        developmentTreeAgentSessions: {
          gateway: {
            createSessionForWorkflow: (options) => {
              createdStages.push(options.context.stage);
              return Promise.resolve({ id: `session-${createdStages.length}` });
            },
            handleMessage: () => Promise.resolve(),
          },
          providerId: "codexCli",
        },
      });

    await readWorkflowStatePayload({
      service: createService(),
      workspaceRoot,
      workspaceSlug,
    });

    assert.deepEqual(createdStages, []);
    assert.equal(
      await stat(
        path.join(
          workspaceRoot,
          ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/local-runtime"
        )
      ).catch(() => null),
      null
    );

    await readWorkflowStatePayload({
      service: createService(),
      workspaceRoot,
      workspaceSlug,
    });
    assert.equal(createdStages.length, 0);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("workflow-state read does not send Quality Gates feedback during rewrite", async () => {
  await runFeedbackScenario({
    sessionId: "quality-session",
    stage: "quality_gates",
    tmpPrefix: "workflow-state-quality-gates-feedback-",
    setup: async (workspaceRoot) => {
      await writeWorkspaceFile(
        workspaceRoot,
        ".husky/pre-commit",
        "#!/bin/sh\nnpm run plan:validate\n"
      );
      await writeWorkspaceFile(
        workspaceRoot,
        ".husky/pre-push",
        "#!/bin/sh\nnpm run plan:validate\n"
      );
    },
  });
});

test("workflow-state read does not send Application Skeleton feedback during rewrite", async () => {
  await runFeedbackScenario({
    sessionId: "skeleton-session",
    stage: "application_skeleton",
    tmpPrefix: "workflow-state-application-skeleton-feedback-",
    setup: async (workspaceRoot, workspaceSlug) => {
      await writeJsonFile(
        workspaceRoot,
        `.codeai-hub/${workspaceSlug}/application_skeleton/application-skeleton-map.json`,
        {
          accepted: true,
          materialized: true,
          materializationState: "materialized",
          materializedPaths: ["product-parts/missing-runtime"],
          productParts: [
            {
              codePath: "product-parts/missing-runtime",
              id: "missing-runtime",
            },
          ],
          reviewState: "materialized",
          schema: "codeai-application-skeleton-v1",
          sourceRoot: "product-parts",
        }
      );
    },
  });
});

test("workflow-state read does not send Diagram Modules feedback during rewrite", async () => {
  await runFeedbackScenario({
    sessionId: "diagram-session",
    stage: "diagram_modules",
    tmpPrefix: "workflow-state-diagram-modules-feedback-",
    setup: async (workspaceRoot, workspaceSlug) => {
      await writeWorkspaceFile(
        workspaceRoot,
        `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts/local-runtime.md`,
        "# Incomplete Product Part\n"
      );
    },
  });
});
