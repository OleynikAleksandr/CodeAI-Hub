import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  buildSessionFilePath,
  buildSessionTranslationFilePath,
} from "@codeai-hub/unified-session";
import type { Request, Response } from "express";
import { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import { handleWorkflowStepClear } from "./workflow-step-clear-service";

const writeFileInWorkspace = async (
  workspaceRoot: string,
  relativePath: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, "test\n", "utf8");
};

const exists = async (targetPath: string): Promise<boolean> =>
  Boolean(await stat(targetPath).catch(() => null));

const createChainJson = (params: {
  readonly providerSessionId: string;
  readonly rootSessionId: string;
  readonly stage: string;
  readonly workspaceSlug: string;
}): string =>
  JSON.stringify(
    {
      dialogId: params.rootSessionId,
      rootSessionId: params.rootSessionId,
      segments: [
        {
          createdAt: "2026-05-22T10:00:00.000Z",
          providerId: "codexCli",
          providerSessionId: params.providerSessionId,
          sessionId: `${params.rootSessionId}-session`,
        },
      ],
      stage: params.stage,
      updatedAt: "2026-05-22T10:00:00.000Z",
      workspaceSlug: params.workspaceSlug,
    },
    null,
    2
  );

const createResponseCapture = () => {
  let statusCode = 200;
  let payload: unknown = null;
  const response = {
    json(nextPayload: unknown) {
      payload = nextPayload;
      return this;
    },
    status(nextStatusCode: number) {
      statusCode = nextStatusCode;
      return this;
    },
  } as unknown as Response;
  return { response, read: () => ({ payload, statusCode }) };
};

const runClear = async (params: {
  readonly body: unknown;
  readonly resetCalls: string[];
  readonly sessionManager: SessionManager;
}) => {
  const capture = createResponseCapture();
  await handleWorkflowStepClear(
    { body: params.body } as Request,
    capture.response,
    {
      logger: new Logger("error"),
      resetWorkflowState: (workspaceSlug) => {
        params.resetCalls.push(workspaceSlug);
      },
      sessionManager: params.sessionManager,
    }
  );
  return capture.read();
};

test("workflow step clear removes selected stage, downstream artifacts and matching sessions", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-step-clear-stage-")
  );
  const homeRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-step-clear-home-")
  );
  const workspaceSlug = "demo-workspace";
  const sessionManager = new SessionManager();
  const resetCalls: string[] = [];
  const previousHome = process.env.HOME;
  try {
    process.env.HOME = homeRoot;
    await writeFileInWorkspace(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/description/Final_Description.md`
    );
    for (const relativePath of [
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
      `.codeai-hub/${workspaceSlug}/application_skeleton/application-skeleton.md`,
      `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.md`,
      `.codeai-hub/${workspaceSlug}/development_tree/materialized/product-parts/core/PartSpec.draft.md`,
      "doc/TODO/stages/diagram-modules/todo-plan.md",
      "doc/TODO/stages/application-skeleton/todo-plan.md",
      "doc/TODO/stages/quality-gates/todo-plan.md",
      "doc/TODO/stages/development-tree/product-parts/core/todo-plan.md",
      "product-parts/core/index.ts",
    ]) {
      await writeFileInWorkspace(workspaceRoot, relativePath);
    }
    await writeFileInWorkspace(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/continuity/description/root/chain.json`
    );
    await writeFile(
      path.join(
        workspaceRoot,
        `.codeai-hub/${workspaceSlug}/continuity/description/root/chain.json`
      ),
      createChainJson({
        providerSessionId: "description-provider",
        rootSessionId: "root",
        stage: "description",
        workspaceSlug,
      }),
      "utf8"
    );
    await writeFileInWorkspace(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/continuity/diagram_modules/root/chain.json`
    );
    await writeFile(
      path.join(
        workspaceRoot,
        `.codeai-hub/${workspaceSlug}/continuity/diagram_modules/root/chain.json`
      ),
      createChainJson({
        providerSessionId: "diagram-provider",
        rootSessionId: "root",
        stage: "diagram_modules",
        workspaceSlug,
      }),
      "utf8"
    );
    const descriptionHistoryPath = buildSessionFilePath({
      provider: "codexCli",
      rootDirectory: path.join(homeRoot, ".codeai-hub", "sessions"),
      sessionId: "description-provider",
      workspaceSlug,
    });
    const diagramHistoryPath = buildSessionFilePath({
      provider: "codexCli",
      rootDirectory: path.join(homeRoot, ".codeai-hub", "sessions"),
      sessionId: "diagram-provider",
      workspaceSlug,
    });
    const diagramTranslationPath = buildSessionTranslationFilePath({
      provider: "codexCli",
      rootDirectory: path.join(homeRoot, ".codeai-hub", "sessions"),
      sessionId: "diagram-provider",
      workspaceSlug,
    });
    for (const userSpacePath of [
      descriptionHistoryPath,
      diagramHistoryPath,
      diagramTranslationPath,
    ]) {
      await mkdir(path.dirname(userSpacePath), { recursive: true });
      await writeFile(userSpacePath, "test\n", "utf8");
    }
    const descriptionSession = sessionManager.createSession(
      "codex",
      workspaceRoot,
      "description-provider",
      { initiativeSlug: workspaceSlug, stage: "description" }
    );
    const diagramSession = sessionManager.createSession(
      "codex",
      workspaceRoot,
      "diagram-provider",
      { initiativeSlug: workspaceSlug, stage: "diagram_modules" }
    );
    sessionManager.createSession("codex", workspaceRoot, "skeleton-provider", {
      initiativeSlug: workspaceSlug,
      stage: "application_skeleton",
    });

    const result = await runClear({
      body: {
        workspacePath: workspaceRoot,
        workspaceSlug,
        target: { kind: "workflow_stage", stage: "diagram_modules" },
      },
      resetCalls,
      sessionManager,
    });

    assert.equal(result.statusCode, 200);
    assert.equal(
      await exists(
        path.join(
          workspaceRoot,
          `.codeai-hub/${workspaceSlug}/description/Final_Description.md`
        )
      ),
      true
    );
    assert.equal(
      await exists(
        path.join(workspaceRoot, `.codeai-hub/${workspaceSlug}/diagram_modules`)
      ),
      false
    );
    assert.equal(
      await exists(path.join(workspaceRoot, "product-parts")),
      false
    );
    assert.equal(
      await exists(
        path.join(workspaceRoot, "doc/TODO/stages/development-tree")
      ),
      false
    );
    assert.deepEqual(resetCalls, [workspaceSlug]);
    assert.ok(sessionManager.getSession(descriptionSession.id));
    assert.equal(sessionManager.getSession(diagramSession.id), undefined);
    assert.equal(await exists(descriptionHistoryPath), true);
    assert.equal(await exists(diagramHistoryPath), false);
    assert.equal(await exists(diagramTranslationPath), false);
  } finally {
    if (previousHome === undefined) {
      process.env.HOME = undefined;
    } else {
      process.env.HOME = previousHome;
    }
    await rm(workspaceRoot, { force: true, recursive: true });
    await rm(homeRoot, { force: true, recursive: true });
  }
});

test("workflow step clear removes a development tree node subtree only", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-step-clear-dev-tree-")
  );
  const workspaceSlug = "demo-workspace";
  const workflowPath =
    "development_tree/materialized/product-parts/core/clusters/api/modules/auth";
  const siblingPath =
    "development_tree/materialized/product-parts/core/clusters/api/modules/billing";
  const sessionManager = new SessionManager();
  const resetCalls: string[] = [];
  try {
    await writeFileInWorkspace(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/${workflowPath}/ModuleSpec.draft.md`
    );
    await writeFileInWorkspace(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/${siblingPath}/ModuleSpec.draft.md`
    );
    await writeFileInWorkspace(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/continuity/${workflowPath}/root/chain.json`
    );
    await writeFileInWorkspace(
      workspaceRoot,
      "doc/TODO/stages/development-tree/product-parts/core/clusters/api/modules/auth/todo-plan.md"
    );
    await writeFileInWorkspace(
      workspaceRoot,
      "product-parts/core/clusters/api/modules/auth/index.ts"
    );
    sessionManager.createSession("codex", workspaceRoot, "auth-provider", {
      initiativeSlug: workspaceSlug,
      stage: `${workflowPath}/workers`,
    });
    const siblingSession = sessionManager.createSession(
      "codex",
      workspaceRoot,
      "billing-provider",
      { initiativeSlug: workspaceSlug, stage: siblingPath }
    );

    const result = await runClear({
      body: {
        workspacePath: workspaceRoot,
        workspaceSlug,
        target: {
          kind: "development_tree_node",
          workflowPath,
          codeWorkspacePath: "product-parts/core/clusters/api/modules/auth",
        },
      },
      resetCalls,
      sessionManager,
    });

    assert.equal(result.statusCode, 200);
    assert.equal(
      await exists(
        path.join(workspaceRoot, `.codeai-hub/${workspaceSlug}/${workflowPath}`)
      ),
      false
    );
    assert.equal(
      await exists(
        path.join(workspaceRoot, `.codeai-hub/${workspaceSlug}/${siblingPath}`)
      ),
      true
    );
    assert.equal(
      await exists(
        path.join(workspaceRoot, "product-parts/core/clusters/api/modules/auth")
      ),
      false
    );
    assert.ok(sessionManager.getSession(siblingSession.id));
    assert.deepEqual(resetCalls, [workspaceSlug]);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
