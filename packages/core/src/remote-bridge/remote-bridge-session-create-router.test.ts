import assert from "node:assert/strict";
import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { Logger } from "../telemetry/logger";
import type { WorkflowRuntime } from "../workflow/runtime/workflow-runtime";
import type { SessionRequestHandler } from "./handlers/session-request-handler";
import { RemoteBridgeSessionCreateRouter } from "./remote-bridge-session-create-router";

const assertDirectoryExists = async (directoryPath: string): Promise<void> => {
  await access(directoryPath);
};

test("session:create prepares workflow stage directories before creating provider session", async () => {
  const workspacePath = await mkdtemp(
    path.join(tmpdir(), "codeai-stage-preflight-")
  );
  const workspaceSlug = "demo-workspace";
  const expectedRoot = path.join(workspacePath, ".codeai-hub", workspaceSlug);

  try {
    let handleCreateCalled = false;
    const sessionHandler = {
      async handleCreate(
        _providerId: string | undefined,
        _workspacePath: string | undefined,
        context: { readonly stage?: string | null } | undefined
      ): Promise<void> {
        assert.equal(context?.stage, "diagram_modules");
        await assertDirectoryExists(path.join(expectedRoot, "diagram_modules"));
        await assertDirectoryExists(
          path.join(expectedRoot, "diagram_modules", "product-parts")
        );
        handleCreateCalled = true;
      },
    } as unknown as SessionRequestHandler;
    const workflowRuntime = {
      connectWorkspace: () => Promise.resolve(),
    } as unknown as WorkflowRuntime;
    const logger = {
      warn(): void {
        return;
      },
    } as unknown as Logger;

    const router = new RemoteBridgeSessionCreateRouter({
      getManager: () => undefined,
      logger,
      sessionHandler,
      workflowRuntime,
    });

    await router.handle("client-1", {
      type: "session:create",
      payload: {
        initiativeSlug: workspaceSlug,
        providerId: "codexCli",
        stage: "diagram_modules",
        workspacePath,
      },
    });

    assert.equal(handleCreateCalled, true);
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});

test("session:create bootstraps managed workspace before application skeleton session", async () => {
  const workspacePath = await mkdtemp(
    path.join(tmpdir(), "codeai-managed-session-create-")
  );
  const workspaceSlug = "demo-workspace";

  try {
    let handleCreateCalled = false;
    const sessionHandler = {
      async handleCreate(
        _providerId: string | undefined,
        _workspacePath: string | undefined,
        context: { readonly stage?: string | null } | undefined
      ): Promise<void> {
        assert.equal(context?.stage, "application_skeleton");
        await assertDirectoryExists(path.join(workspacePath, ".git"));
        await assertDirectoryExists(
          path.join(workspacePath, ".codeai-hub", "workflow")
        );
        await access(path.join(workspacePath, ".husky", "pre-commit"));
        await access(path.join(workspacePath, "doc", "TODO", "todo-plan.md"));
        assert.equal(
          (
            await readFile(
              path.join(workspacePath, "doc", "TODO", "todo-plan.md"),
              "utf8"
            )
          ).includes("feat: materialize application skeleton"),
          true
        );
        await access(
          path.join(
            workspacePath,
            "scripts",
            "plan-orchestrator",
            "plan-cli.mjs"
          )
        );
        handleCreateCalled = true;
      },
    } as unknown as SessionRequestHandler;
    const workflowRuntime = {
      connectWorkspace: () => Promise.resolve(),
    } as unknown as WorkflowRuntime;
    const logger = {
      warn(): void {
        return;
      },
    } as unknown as Logger;

    const router = new RemoteBridgeSessionCreateRouter({
      getManager: () => undefined,
      logger,
      sessionHandler,
      workflowRuntime,
    });

    await router.handle("client-1", {
      type: "session:create",
      payload: {
        initiativeSlug: workspaceSlug,
        providerId: "codexCli",
        stage: "application_skeleton",
        workspacePath,
      },
    });

    assert.equal(handleCreateCalled, true);
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});
