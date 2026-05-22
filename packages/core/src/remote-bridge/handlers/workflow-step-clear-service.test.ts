import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
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
  const workspaceSlug = "demo-workspace";
  const sessionManager = new SessionManager();
  const resetCalls: string[] = [];
  try {
    await writeFileInWorkspace(
      workspaceRoot,
      `.codeai-hub/${workspaceSlug}/description/Final_Description.md`
    );
    for (const relativePath of [
      `.codeai-hub/${workspaceSlug}/diagram_modules/product-parts.index.md`,
      `.codeai-hub/${workspaceSlug}/application_skeleton/application-skeleton.md`,
      `.codeai-hub/${workspaceSlug}/quality_gates/quality-gates.md`,
      `.codeai-hub/${workspaceSlug}/continuity/diagram_modules/root/chain.json`,
      `.codeai-hub/${workspaceSlug}/continuity/application_skeleton/root/chain.json`,
      `.codeai-hub/${workspaceSlug}/development_tree/materialized/product-parts/core/PartSpec.draft.md`,
      "doc/TODO/stages/diagram-modules/todo-plan.md",
      "doc/TODO/stages/application-skeleton/todo-plan.md",
      "doc/TODO/stages/quality-gates/todo-plan.md",
      "doc/TODO/stages/development-tree/product-parts/core/todo-plan.md",
      "product-parts/core/index.ts",
    ]) {
      await writeFileInWorkspace(workspaceRoot, relativePath);
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
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
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
