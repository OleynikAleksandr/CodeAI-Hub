import assert from "node:assert/strict";
import { access, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { Logger } from "../telemetry/logger";
import type { WorkflowRuntime } from "../workflow/runtime/workflow-runtime";
import type { SessionRequestHandler } from "./handlers/session-request-handler";
import { TECHNICAL_STAGE_REWRITE_BLOCKER_CODE } from "./handlers/session-request-handler-workflow-session";
import { RemoteBridgeSessionCreateRouter } from "./remote-bridge-session-create-router";

const TECHNICAL_STAGES = [
  "diagram_modules",
  "application_skeleton",
  "quality_gates",
] as const;

const assertMissing = async (targetPath: string): Promise<void> => {
  await assert.rejects(access(targetPath));
};

const createLogger = (warnings: unknown[] = []): Logger =>
  ({
    warn: (_message: string, context?: unknown) => {
      warnings.push(context);
    },
  }) as unknown as Logger;

test("session:create skips technical stage preflight while rewrite is active", async () => {
  const workspacePath = await mkdtemp(
    path.join(tmpdir(), "codeai-technical-preflight-skipped-")
  );
  const workspaceSlug = "demo-workspace";
  const seenStages: string[] = [];
  const warnings: unknown[] = [];

  try {
    const sessionHandler = {
      handleCreate(
        providerId: string | undefined,
        workspaceRoot: string | undefined,
        context: { readonly stage?: string | null } | undefined
      ): Promise<void> {
        assert.equal(providerId, "codexCli");
        assert.equal(workspaceRoot, workspacePath);
        assert.ok(typeof context?.stage === "string");
        seenStages.push(context.stage);
        return Promise.resolve();
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

    for (const stage of TECHNICAL_STAGES) {
      await router.handle("client-1", {
        type: "session:create",
        payload: {
          initiativeSlug: workspaceSlug,
          providerId: "codexCli",
          runSlug: "run-1",
          stage,
          workspacePath,
        },
      });
    }

    assert.deepEqual(seenStages, [...TECHNICAL_STAGES]);
    assert.deepEqual(
      warnings.map((warning) =>
        typeof warning === "object" && warning !== null
          ? (warning as { readonly code?: string }).code
          : null
      ),
      [
        TECHNICAL_STAGE_REWRITE_BLOCKER_CODE,
        TECHNICAL_STAGE_REWRITE_BLOCKER_CODE,
        TECHNICAL_STAGE_REWRITE_BLOCKER_CODE,
      ]
    );
    await assertMissing(path.join(workspacePath, ".git"));
    await assertMissing(path.join(workspacePath, ".husky"));
    await assertMissing(path.join(workspacePath, "doc", "TODO"));
    await assertMissing(path.join(workspacePath, ".codeai-hub", workspaceSlug));
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
