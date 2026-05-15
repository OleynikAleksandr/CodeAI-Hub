import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { Logger } from "../telemetry/logger";
import type { WorkflowRuntime } from "../workflow/runtime/workflow-runtime";
import type { SessionRequestHandler } from "./handlers/session-request-handler";
import { RemoteBridgeSessionCreateRouter } from "./remote-bridge-session-create-router";

const ACTIVE_DIAGRAM_MODULES_RE = /"activeStage": "diagram_modules"/u;
const DIAGRAM_MODULES_INDEX_TASK_RE = /diagram-modules\.phase1\.index\.task1/u;

const assertMissing = async (targetPath: string): Promise<void> => {
  await assert.rejects(access(targetPath));
};

const createLogger = (warnings: unknown[] = []): Logger =>
  ({
    warn: (_message: string, context?: unknown) => {
      warnings.push(context);
    },
  }) as unknown as Logger;

test("session:create installs Diagram Modules managed scaffold before provider dispatch", async () => {
  const workspacePath = await mkdtemp(
    path.join(tmpdir(), "codeai-diagram-scaffold-preflight-")
  );
  const workspaceSlug = "demo-workspace";
  const warnings: unknown[] = [];
  let handleCreateCalled = false;

  try {
    const sessionHandler = {
      async handleCreate(
        providerId: string | undefined,
        workspaceRoot: string | undefined,
        context: { readonly stage?: string | null } | undefined
      ): Promise<void> {
        assert.equal(providerId, "codexCli");
        assert.equal(workspaceRoot, workspacePath);
        assert.equal(context?.stage, "diagram_modules");
        const workspacePlan = await readFile(
          path.join(workspacePath, "doc/TODO/workspace.plan.md"),
          "utf8"
        );
        const diagramPlan = await readFile(
          path.join(
            workspacePath,
            "doc/TODO/stages/diagram-modules/todo-plan.md"
          ),
          "utf8"
        );
        assert.match(workspacePlan, ACTIVE_DIAGRAM_MODULES_RE);
        assert.match(diagramPlan, DIAGRAM_MODULES_INDEX_TASK_RE);
        handleCreateCalled = true;
      },
    } as unknown as SessionRequestHandler;
    const router = new RemoteBridgeSessionCreateRouter({
      getManager: () => undefined,
      logger: createLogger(warnings),
      sessionHandler,
      workflowRuntime: {
        connectWorkspace: () => Promise.resolve(),
      } as unknown as WorkflowRuntime,
    });

    await router.handle("client-1", {
      type: "session:create",
      payload: {
        initiativeSlug: workspaceSlug,
        providerId: "codexCli",
        runSlug: "run-1",
        stage: "diagram_modules",
        workspacePath,
      },
    });

    assert.equal(handleCreateCalled, true);
    assert.deepEqual(warnings, []);
    await access(path.join(workspacePath, ".husky", "pre-commit"));
    await access(
      path.join(workspacePath, ".codeai-hub", workspaceSlug, "diagram_modules")
    );
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});

test("session:create still prepares documentation workflow stage directories", async () => {
  const workspacePath = await mkdtemp(
    path.join(tmpdir(), "codeai-documentation-preflight-")
  );
  const workspaceSlug = "demo-workspace";
  let handleCreateCalled = false;

  try {
    const sessionHandler = {
      handleCreate(
        providerId: string | undefined,
        workspaceRoot: string | undefined,
        context: { readonly stage?: string | null } | undefined
      ): Promise<void> {
        assert.equal(providerId, "codexCli");
        assert.equal(workspaceRoot, workspacePath);
        assert.equal(context?.stage, "description");
        handleCreateCalled = true;
        return Promise.resolve();
      },
    } as unknown as SessionRequestHandler;
    const router = new RemoteBridgeSessionCreateRouter({
      getManager: () => undefined,
      logger: createLogger(),
      sessionHandler,
      workflowRuntime: {
        connectWorkspace: () => Promise.resolve(),
      } as unknown as WorkflowRuntime,
    });

    await router.handle("client-1", {
      type: "session:create",
      payload: {
        initiativeSlug: workspaceSlug,
        providerId: "codexCli",
        stage: "description",
        workspacePath,
      },
    });

    assert.equal(handleCreateCalled, true);
    await access(path.join(workspacePath, ".codeai-hub", workspaceSlug));
    await access(
      path.join(workspacePath, ".codeai-hub", workspaceSlug, "description")
    );
    await assertMissing(path.join(workspacePath, ".git"));
    await assertMissing(path.join(workspacePath, "doc", "TODO"));
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});
