import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { Logger } from "../telemetry/logger";
import type { WorkflowRuntime } from "../workflow/runtime/workflow-runtime";
import type { SessionRequestHandler } from "./handlers/session-request-handler";
import { RemoteBridgeSessionCreateRouter } from "./remote-bridge-session-create-router";

const assertMissing = async (targetPath: string): Promise<void> => {
  await assert.rejects(access(targetPath));
};

const createLogger = (warnings: unknown[] = []): Logger =>
  ({
    warn: (_message: string, context?: unknown) => {
      warnings.push(context);
    },
  }) as unknown as Logger;

test("session:create leaves Diagram Modules managed scaffold to the Core start boundary", async () => {
  const workspacePath = await mkdtemp(
    path.join(tmpdir(), "codeai-diagram-boundary-preflight-")
  );
  const workspaceSlug = "demo-workspace";
  const warnings: unknown[] = [];
  const calls: string[] = [];
  let handleCreateCalled = false;

  try {
    const sessionHandler = {
      async handleCreate(
        providerId: string | undefined,
        workspaceRoot: string | undefined,
        context: { readonly stage?: string | null } | undefined
      ): Promise<void> {
        calls.push(`handle-create:${context?.stage ?? ""}`);
        assert.equal(providerId, "codexCli");
        assert.equal(workspaceRoot, workspacePath);
        assert.equal(context?.stage, "diagram_modules");
        await assertMissing(path.join(workspacePath, "doc", "TODO"));
        await assertMissing(path.join(workspacePath, ".husky"));
        await assertMissing(path.join(workspacePath, "package.json"));
        await assertMissing(path.join(workspacePath, "scripts"));
        handleCreateCalled = true;
      },
    } as unknown as SessionRequestHandler;
    const router = new RemoteBridgeSessionCreateRouter({
      getManager: () => undefined,
      logger: createLogger(warnings),
      sessionHandler,
      workflowBoundaryFacade: {
        ensureBoundary: async (params) => {
          calls.push(`boundary:${params.stage}`);
          assert.equal(params.workspaceRoot, workspacePath);
          assert.equal(params.workspaceSlug, workspaceSlug);
          await assertMissing(
            path.join(
              workspacePath,
              ".codeai-hub",
              workspaceSlug,
              "diagram_modules"
            )
          );
          await assertMissing(path.join(workspacePath, "doc", "TODO"));
          return {
            boundaryHash: "abc123",
            created: true,
            registryPath: path.join(workspacePath, "boundaries.json"),
            stage: params.stage,
          };
        },
      },
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
    assert.deepEqual(calls, [
      "boundary:diagram_modules",
      "handle-create:diagram_modules",
    ]);
    assert.deepEqual(warnings, []);
    await assertMissing(path.join(workspacePath, ".husky", "pre-commit"));
    await assertMissing(path.join(workspacePath, "doc", "TODO"));
    await assertMissing(path.join(workspacePath, "package.json"));
    await assertMissing(path.join(workspacePath, "scripts"));
    await access(
      path.join(workspacePath, ".codeai-hub", workspaceSlug, "diagram_modules")
    );
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});

test("session:create keeps dirty workflow settings out of workflow history before every post-description boundary", async () => {
  const cases = [
    "virtual_simulation",
    "diagram_modules",
    "application_skeleton",
    "quality_gates",
  ] as const;

  for (const stage of cases) {
    const workspacePath = await mkdtemp(
      path.join(tmpdir(), `codeai-${stage}-settings-boundary-`)
    );
    const workspaceSlug = "demo-workspace";
    const settingsPath = path.join(
      workspacePath,
      ".codeai-hub",
      workspaceSlug,
      "runtime",
      "settings",
      "settings.json"
    );
    const calls: string[] = [];

    try {
      await mkdir(path.join(workspacePath, ".git"), { recursive: true });
      await mkdir(path.dirname(settingsPath), { recursive: true });
      await writeFile(settingsPath, "{}\n", "utf8");
      const router = new RemoteBridgeSessionCreateRouter({
        getManager: () => undefined,
        logger: createLogger(),
        sessionHandler: {
          handleCreate: () => {
            calls.push("handle-create");
            return Promise.resolve();
          },
        } as unknown as SessionRequestHandler,
        workflowBoundaryFacade: {
          ensureBoundary: (params) => {
            calls.push(`boundary:${params.stage}`);
            return Promise.resolve({
              boundaryHash: "abc123",
              created: true,
              registryPath: path.join(workspacePath, "boundaries.json"),
              stage: params.stage,
            });
          },
        },
        workflowRuntime: {
          connectWorkspace: () => Promise.resolve(),
        } as unknown as WorkflowRuntime,
      });

      await router.handle("client-1", {
        type: "session:create",
        payload: {
          initiativeSlug: workspaceSlug,
          providerId: "codexCli",
          stage,
          workspacePath,
        },
      });

      assert.deepEqual(calls, [`boundary:${stage}`, "handle-create"]);
    } finally {
      await rm(workspacePath, { force: true, recursive: true });
    }
  }
});

test("session:create still prepares documentation workflow stage directories", async () => {
  const workspacePath = await mkdtemp(
    path.join(tmpdir(), "codeai-documentation-preflight-")
  );
  const workspaceSlug = "demo-workspace";
  const calls: string[] = [];
  let handleCreateCalled = false;

  try {
    const sessionHandler = {
      handleCreate(
        providerId: string | undefined,
        workspaceRoot: string | undefined,
        context: { readonly stage?: string | null } | undefined
      ): Promise<void> {
        calls.push(`handle-create:${context?.stage ?? ""}`);
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
      workflowBoundaryFacade: {
        ensureBoundary: (params) => {
          calls.push(`boundary:${params.stage}`);
          return Promise.resolve({
            boundaryHash: "abc123",
            created: true,
            registryPath: path.join(workspacePath, "boundaries.json"),
            stage: params.stage,
          });
        },
      },
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
    assert.deepEqual(calls, [
      "boundary:description",
      "handle-create:description",
    ]);
    await access(path.join(workspacePath, ".codeai-hub", workspaceSlug));
    await access(
      path.join(workspacePath, ".codeai-hub", workspaceSlug, "description")
    );
    await access(
      path.join(
        workspacePath,
        ".codeai-hub",
        workspaceSlug,
        "description",
        "questionnaire.md"
      )
    );
    await assertMissing(path.join(workspacePath, ".git"));
    await assertMissing(path.join(workspacePath, "doc", "TODO"));
  } finally {
    await rm(workspacePath, { force: true, recursive: true });
  }
});
