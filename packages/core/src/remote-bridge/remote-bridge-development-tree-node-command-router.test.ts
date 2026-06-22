import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import type { SessionRequestHandler } from "./handlers/session-request-handler";
import { RemoteBridgeDevelopmentTreeNodeCommandRouter } from "./remote-bridge-development-tree-node-command-router";
import type { RemoteBridgeSessionCreateRouter } from "./remote-bridge-session-create-router";

const execFileAsync = promisify(execFile);
const PRODUCT_PART_BRIEF_MESSAGE_PATTERN = /ProductPartDevelopmentBrief/u;

const commitWorkspace = async (workspaceRoot: string): Promise<void> => {
  await execFileAsync("git", ["init"], { cwd: workspaceRoot });
  await execFileAsync("git", ["add", "."], { cwd: workspaceRoot });
  await execFileAsync(
    "git",
    [
      "-c",
      "user.name=CodeAI Test",
      "-c",
      "user.email=codeai-test@example.com",
      "commit",
      "-m",
      "test workspace",
    ],
    { cwd: workspaceRoot }
  );
};

const createRouter = (
  options: { readonly withSessionHandler?: boolean } = {}
) => {
  const bootstrapped: Array<{
    readonly content: string;
    readonly sessionId: string;
    readonly stage: string;
  }> = [];
  const errors: Array<{ readonly code: string; readonly message: string }> = [];
  const sessions: Array<{
    readonly clientId: string;
    readonly payload: Record<string, unknown>;
  }> = [];
  const sessionCreateRouter = {
    handle: (
      clientId: string,
      incoming: { readonly payload: Record<string, unknown> }
    ): Promise<void> => {
      sessions.push({ clientId, payload: incoming.payload });
      return Promise.resolve();
    },
  } as unknown as RemoteBridgeSessionCreateRouter;
  const sessionHandler = {
    createSessionForWorkflow: (options: {
      readonly context: { readonly stage: string };
    }): Promise<{ readonly id: string }> => {
      const id = `session-${bootstrapped.length + 1}`;
      bootstrapped.push({
        content: "",
        sessionId: id,
        stage: options.context.stage,
      });
      return Promise.resolve({ id });
    },
    handleMessage: (sessionId: string, content: string): Promise<void> => {
      const index = bootstrapped.findIndex(
        (entry) => entry.sessionId === sessionId
      );
      if (index >= 0) {
        bootstrapped[index] = { ...bootstrapped[index], content };
      }
      return Promise.resolve();
    },
  };
  return {
    bootstrapped,
    errors,
    router: new RemoteBridgeDevelopmentTreeNodeCommandRouter({
      sendCommandError: (_clientId, _command, message, code) => {
        errors.push({ code, message });
      },
      sessionHandler:
        options.withSessionHandler === false
          ? undefined
          : (sessionHandler as unknown as SessionRequestHandler),
      sessionCreateRouter,
    }),
    sessions,
  };
};

test("Development Tree node router allows Product Part nodes before downstream brief acceptance", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "devtree-node-router-")
  );
  const workspaceSlug = "demo-workspace";
  const productPartWorkflowPath =
    "development_tree/materialized/product-parts/core-runtime";
  try {
    await mkdir(
      path.join(
        workspaceRoot,
        ".codeai-hub",
        workspaceSlug,
        productPartWorkflowPath
      ),
      { recursive: true }
    );
    await writeFile(path.join(workspaceRoot, ".gitkeep"), "", "utf8");
    await commitWorkspace(workspaceRoot);
    const { bootstrapped, errors, router, sessions } = createRouter();

    await router.handle("client-1", {
      providerId: "codexCli",
      workspacePath: workspaceRoot,
      workspaceSlug,
      workflowPath: productPartWorkflowPath,
    });

    assert.deepEqual(errors, []);
    assert.deepEqual(sessions, []);
    assert.deepEqual(
      bootstrapped.map((entry) => entry.stage),
      [productPartWorkflowPath]
    );
    assert.match(
      bootstrapped[0]?.content ?? "",
      PRODUCT_PART_BRIEF_MESSAGE_PATTERN
    );

    await commitWorkspace(workspaceRoot);

    await router.handle("client-1", {
      providerId: "codexCli",
      workspacePath: workspaceRoot,
      workspaceSlug,
      workflowPath:
        "development_tree/materialized/product-parts/core-runtime/clusters/runtime-api",
    });

    const latestError = errors.at(-1) as { readonly code: string } | undefined;
    assert.equal(latestError?.code, "product_part_brief_pending");
    assert.equal(sessions.length, 0);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("Development Tree node router fallback relies on settings for model selection", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "devtree-node-router-")
  );
  const workspaceSlug = "demo-workspace";
  const productPartWorkflowPath =
    "development_tree/materialized/product-parts/core-runtime";
  try {
    await mkdir(
      path.join(
        workspaceRoot,
        ".codeai-hub",
        workspaceSlug,
        productPartWorkflowPath
      ),
      { recursive: true }
    );
    await writeFile(path.join(workspaceRoot, ".gitkeep"), "", "utf8");
    await commitWorkspace(workspaceRoot);
    const { errors, router, sessions } = createRouter({
      withSessionHandler: false,
    });
    const staleClientPayload = {
      modelId: "stale-one-shot-model",
      providerId: "glmNative",
      workspacePath: workspaceRoot,
      workspaceSlug,
      workflowPath: productPartWorkflowPath,
    };

    await router.handle("client-1", staleClientPayload);

    assert.deepEqual(errors, []);
    assert.equal(sessions.length, 1);
    assert.equal(sessions[0]?.payload.providerId, "glmNative");
    assert.equal(sessions[0]?.payload.stage, productPartWorkflowPath);
    assert.equal(
      Object.hasOwn(sessions[0]?.payload ?? {}, "modelSelection"),
      false
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
