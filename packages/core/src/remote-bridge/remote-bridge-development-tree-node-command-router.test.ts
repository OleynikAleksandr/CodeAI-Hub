import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { RemoteBridgeDevelopmentTreeNodeCommandRouter } from "./remote-bridge-development-tree-node-command-router";
import type { RemoteBridgeSessionCreateRouter } from "./remote-bridge-session-create-router";

const execFileAsync = promisify(execFile);

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

const createRouter = () => {
  const errors: Array<{ readonly code: string; readonly message: string }> = [];
  const sessions: Array<{ readonly clientId: string; readonly stage: string }> =
    [];
  const sessionCreateRouter = {
    handle: (
      clientId: string,
      incoming: { readonly payload: { readonly stage?: string | null } }
    ): Promise<void> => {
      sessions.push({ clientId, stage: incoming.payload.stage ?? "" });
      return Promise.resolve();
    },
  } as unknown as RemoteBridgeSessionCreateRouter;
  return {
    errors,
    router: new RemoteBridgeDevelopmentTreeNodeCommandRouter({
      sendCommandError: (_clientId, _command, message, code) => {
        errors.push({ code, message });
      },
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
    const { errors, router, sessions } = createRouter();

    await router.handle("client-1", {
      providerId: "codexCli",
      workspacePath: workspaceRoot,
      workspaceSlug,
      workflowPath: productPartWorkflowPath,
    });

    assert.deepEqual(errors, []);
    assert.deepEqual(sessions, [
      { clientId: "client-1", stage: productPartWorkflowPath },
    ]);

    await router.handle("client-1", {
      providerId: "codexCli",
      workspacePath: workspaceRoot,
      workspaceSlug,
      workflowPath:
        "development_tree/materialized/product-parts/core-runtime/clusters/runtime-api",
    });

    const latestError = errors.at(-1) as { readonly code: string } | undefined;
    assert.equal(latestError?.code, "product_part_brief_pending");
    assert.equal(sessions.length, 1);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
