import assert from "node:assert/strict";
import test from "node:test";
import type { Request, Response } from "express";
import { SessionManager } from "../../session-manager";
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

const runClear = async (body: unknown) => {
  const resetCalls: string[] = [];
  const sessionManager = new SessionManager();
  const capture = createResponseCapture();
  await handleWorkflowStepClear({ body } as Request, capture.response, {
    logger: new Logger("error"),
    resetWorkflowState: (workspaceSlug) => {
      resetCalls.push(workspaceSlug);
    },
    sessionManager,
  });
  return { ...capture.read(), resetCalls, sessionManager };
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

test("workflow step clear keeps the endpoint contract but disables legacy rollback", async () => {
  const result = await runClear({
    target: { kind: "workflow_stage", stage: "virtual_simulation" },
    workspacePath: "/tmp/demo",
    workspaceSlug: "demo-workspace",
  });

  assert.equal(result.statusCode, 501);
  assert.deepEqual(result.payload, {
    code: "workflow_clear_git_boundary_pending",
    error:
      "Workflow step clear is unavailable until Core-owned Git boundary rollback is implemented",
    target: { kind: "workflow_stage", stage: "virtual_simulation" },
  });
  assert.deepEqual(result.resetCalls, []);
  assert.deepEqual(result.sessionManager.listSessions(), []);
});
