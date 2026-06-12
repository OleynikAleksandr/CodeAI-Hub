import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { Request, Response } from "express";
import { Logger } from "../../telemetry/logger";
import { WorkflowStateService } from "./workflow-state-service";

const WORKSPACE_SLUG = "demo-workspace";

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const readWorkflowState = async (params: {
  readonly service: WorkflowStateService;
  readonly workspaceRoot: string;
}): Promise<Record<string, unknown>> =>
  new Promise((resolve) => {
    const req = {
      query: {
        workspacePath: params.workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      },
    } as unknown as Request;
    const res = {
      json(payload: unknown) {
        resolve(payload as Record<string, unknown>);
        return this;
      },
    } as unknown as Response;
    params.service.handleWorkflowStateRead(req, res);
  });

const createQualityGatesContract = (accepted: boolean): string =>
  `${JSON.stringify(
    {
      accepted,
      commands: {
        "qg-secret-scan": {
          availability: "executable",
          desiredStatus: "active",
          id: "qg-secret-scan",
        },
      },
      integrated: false,
      requiredBeforeCommit: ["qg-secret-scan"],
      schema: "codeai-quality-gates-v1",
    },
    null,
    2
  )}\n`;

const writeQualityGatesArtifacts = async (
  workspaceRoot: string,
  accepted: boolean
): Promise<void> => {
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.md`,
    "# Quality Gates Baseline\n"
  );
  await writeWorkspaceFile(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/quality_gates/quality-gates.json`,
    createQualityGatesContract(accepted)
  );
};

const readUserGateCursor = (
  payload: Record<string, unknown>
): {
  readonly activeUserGate?: Record<string, unknown> | null;
  readonly queuedUserGates?: readonly Record<string, unknown>[];
} => payload.userGateCursor as never;

test("workflow-state exposes Quality Gates review as active user attention", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-attention-qg-review-")
  );
  try {
    await writeQualityGatesArtifacts(workspaceRoot, false);
    const payload = await readWorkflowState({
      service: new WorkflowStateService({ logger: new Logger("error") }),
      workspaceRoot,
    });
    const cursor = readUserGateCursor(payload);

    assert.equal(cursor.activeUserGate?.nodeId, "workflow:quality_gates");
    assert.equal(
      cursor.activeUserGate?.reason,
      "managed_stage_review_required"
    );
    assert.equal(cursor.activeUserGate?.inputLocked, false);
    assert.equal(cursor.activeUserGate?.status, "active");
    assert.deepEqual(cursor.queuedUserGates, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("workflow-state does not expose accepted Quality Gates as user attention", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workflow-attention-qg-accepted-")
  );
  try {
    await writeQualityGatesArtifacts(workspaceRoot, true);
    const payload = await readWorkflowState({
      service: new WorkflowStateService({ logger: new Logger("error") }),
      workspaceRoot,
    });
    const cursor = readUserGateCursor(payload);

    assert.equal(cursor.activeUserGate, null);
    assert.deepEqual(cursor.queuedUserGates, []);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
