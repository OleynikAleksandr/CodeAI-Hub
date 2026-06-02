import assert from "node:assert/strict";
import { execFile } from "node:child_process";
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
import { promisify } from "node:util";
import type { Request, Response } from "express";
import { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import { WorkflowStateService } from "./workflow-state-service";

const execFileAsync = promisify(execFile);
const LOCAL_RUNTIME_PATTERN = /local-runtime/;
const PRODUCT_PART_BRIEF_TITLE_PATTERN = /ProductPartDevelopmentBrief/;
const PRODUCT_PART_BRIEF_DRAFT_PATTERN =
  /ProductPartDevelopmentBrief\.draft\.md/;

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
    "- leadProductPartId: `local-runtime`",
    "- productPartLeadershipOrder: `local-runtime`",
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
    });

    await readWorkflowStateTwice({ service, workspaceRoot, workspaceSlug });
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
};

test("workflow-state read bootstraps Product Part brief plans and sessions only", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-state-development-tree-")
  );
  const workspaceSlug = "demo-workspace";

  try {
    await writeTechnicalRootArtifacts(workspaceRoot, workspaceSlug);
    await mkdir(
      path.join(
        workspaceRoot,
        ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/local-runtime/modules/provider-bridge"
      ),
      { recursive: true }
    );
    await commitWorkspace(workspaceRoot);

    const sessionManager = new SessionManager();
    sessionManager.createSession("codexCli", workspaceRoot, "provider-root", {
      initiativeSlug: workspaceSlug,
      stage: "quality_gates",
    });
    const createdStages: string[] = [];
    const sentMessages: string[] = [];
    const service = new WorkflowStateService({
      developmentTreeAgentGateway: {
        createSessionForWorkflow: (options) => {
          createdStages.push(options.context.stage);
          const session = sessionManager.createSession(
            options.providerId,
            options.workspacePath,
            `provider-${createdStages.length}`,
            options.context
          );
          return Promise.resolve(session);
        },
        handleMessage: (sessionId, content) => {
          sentMessages.push(content);
          sessionManager.appendMessage(sessionId, "user", content);
          return Promise.resolve();
        },
      },
      logger: new Logger("error"),
      sessionManager,
    });

    await readWorkflowStatePayload({
      service,
      workspaceRoot,
      workspaceSlug,
    });

    const productPartPlan = path.join(
      workspaceRoot,
      "doc/TODO/stages/development-tree/product-parts/local-runtime/todo-plan.md"
    );
    const productPartBrief = path.join(
      workspaceRoot,
      ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/local-runtime/ProductPartDevelopmentBrief.draft.md"
    );
    const moduleDraft = path.join(
      workspaceRoot,
      ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/local-runtime/modules/provider-bridge/ModuleSpec.draft.md"
    );

    assert.match(
      await readFile(productPartPlan, "utf8"),
      LOCAL_RUNTIME_PATTERN
    );
    assert.match(
      await readFile(productPartBrief, "utf8"),
      PRODUCT_PART_BRIEF_TITLE_PATTERN
    );
    assert.equal(await stat(moduleDraft).catch(() => null), null);
    assert.deepEqual(createdStages, [
      "development_tree/materialized/product-parts/local-runtime",
    ]);
    assert.equal(sentMessages.length, 1);
    assert.match(sentMessages[0] ?? "", PRODUCT_PART_BRIEF_DRAFT_PATTERN);
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
