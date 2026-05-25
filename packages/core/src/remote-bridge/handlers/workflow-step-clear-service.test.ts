import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { type Session, SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import { handleWorkflowStepClear } from "./workflow-step-clear-service";

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

const runClear = async (
  body: unknown,
  sessionManager = new SessionManager()
) => {
  const resetCalls: string[] = [];
  const restoreObservedSessionIds: string[][] = [];
  const capture = createResponseCapture();
  await handleWorkflowStepClear({ body } as Request, capture.response, {
    logger: new Logger("error"),
    resetWorkflowState: (workspaceSlug) => {
      resetCalls.push(workspaceSlug);
    },
    sessionManager,
    workflowBoundaryFacade: {
      restoreBoundary: (params) => {
        restoreObservedSessionIds.push(
          sessionManager.listSessions().map((session: Session) => session.id)
        );
        return Promise.resolve({
          boundaryHash: "abc123",
          clearCommitHash: "def456",
          prunedStages: [params.stage],
          registryPath: "/tmp/boundaries.json",
          stage: params.stage,
        });
      },
    },
  });
  return {
    ...capture.read(),
    resetCalls,
    restoreObservedSessionIds,
    sessionManager,
  };
};

test("workflow step clear rejects invalid requests", async () => {
  const result = await runClear({
    target: { kind: "workflow_stage", stage: "missing_stage" },
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
  });

  assert.equal(result.statusCode, 400);
  assert.deepEqual(result.payload, { error: "Invalid workflow clear request" });
  assert.deepEqual(result.resetCalls, []);
});

test("workflow step clear restores workflow stages from Git boundary", async () => {
  const sessionManager = new SessionManager();
  const description = sessionManager.createSession(
    "codex",
    "/tmp/demo",
    undefined,
    {
      initiativeSlug: "demo-workspace",
      stage: "description",
    }
  );
  const virtual = sessionManager.createSession(
    "codex",
    "/tmp/demo",
    undefined,
    {
      initiativeSlug: "demo-workspace",
      stage: "virtual_simulation",
    }
  );
  const diagram = sessionManager.createSession(
    "codex",
    "/tmp/demo",
    undefined,
    {
      initiativeSlug: "demo-workspace",
      stage: "diagram_modules",
    }
  );
  const other = sessionManager.createSession("codex", "/tmp/other", undefined, {
    initiativeSlug: "demo-workspace",
    stage: "diagram_modules",
  });

  const result = await runClear(
    {
      target: { kind: "workflow_stage", stage: "virtual_simulation" },
      workspacePath: "/tmp/demo",
      workspaceSlug: "demo-workspace",
    },
    sessionManager
  );

  assert.equal(result.statusCode, 200);
  assert.deepEqual(result.payload, {
    cleared: true,
    deletedSessionIds: [virtual.id, diagram.id],
    restore: {
      boundaryHash: "abc123",
      clearCommitHash: "def456",
      prunedStages: ["virtual_simulation"],
      registryPath: "/tmp/boundaries.json",
      stage: "virtual_simulation",
    },
    target: { kind: "workflow_stage", stage: "virtual_simulation" },
    workspaceSlug: "demo-workspace",
  });
  assert.deepEqual(result.resetCalls, ["demo-workspace"]);
  assert.deepEqual(result.restoreObservedSessionIds, [
    [description.id, other.id],
  ]);
  assert.deepEqual(
    result.sessionManager.listSessions().map((session: Session) => session.id),
    [description.id, other.id]
  );
});

test("workflow step clear keeps development-tree node clear fail-closed", async () => {
  const result = await runClear({
    target: {
      codeWorkspacePath: null,
      kind: "development_tree_node",
      workflowPath: "development_tree/product-part/task",
    },
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
  });

  assert.equal(result.statusCode, 501);
  assert.deepEqual(result.payload, {
    code: "workflow_clear_development_tree_boundary_pending",
    error:
      "Development Tree node clear is unavailable until node-level Git boundary rollback is implemented",
    target: {
      codeWorkspacePath: null,
      kind: "development_tree_node",
      workflowPath: "development_tree/product-part/task",
    },
  });
  assert.deepEqual(result.resetCalls, []);
});
