import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { Request, Response } from "express";
import { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import { WorkflowStepUndoLedgerStore } from "../../workflow/undo/workflow-step-undo-ledger";
import { handleWorkspaceFileWrite } from "./workspace-file-service";

const writeWorkspaceFile = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const runWorkspaceFileWrite = async (params: {
  readonly content: string;
  readonly path: string;
  readonly sessionId: string;
  readonly sessionManager: SessionManager;
}): Promise<{ readonly payload: unknown; readonly statusCode: number }> => {
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
  await handleWorkspaceFileWrite(
    {
      body: {
        content: params.content,
        path: params.path,
        sessionId: params.sessionId,
      },
    } as Request,
    response,
    params.sessionManager,
    new Logger("error")
  );
  return { payload, statusCode };
};

test("workspace file write records questionnaire preserve undo entry", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workspace-file-questionnaire-undo-")
  );
  const workspaceSlug = "demo-workspace";
  const sessionManager = new SessionManager();
  try {
    const session = sessionManager.createSession(
      "codexCli",
      workspaceRoot,
      undefined,
      { initiativeSlug: workspaceSlug, stage: "description" }
    );
    const questionnairePath = `.codeai-hub/${workspaceSlug}/description/questionnaire.md`;

    const result = await runWorkspaceFileWrite({
      content: "answers",
      path: questionnairePath,
      sessionId: session.id,
      sessionManager,
    });

    assert.equal(result.statusCode, 200);
    const ledger = await new WorkflowStepUndoLedgerStore({
      workspaceRoot,
      workspaceSlug,
    }).read();
    assert.deepEqual(
      ledger?.entries.map((entry) => ({
        kind: entry.kind,
        previousContent: entry.previousContent,
        relativePath: entry.relativePath,
        source: entry.source,
        stage: entry.stage,
        undoBehavior: entry.undoBehavior,
      })),
      [
        {
          kind: "write_file",
          previousContent: null,
          relativePath: questionnairePath,
          source: "workspace_file_write",
          stage: "description",
          undoBehavior: "preserve_path",
        },
      ]
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("workspace file write records previous content for generated workflow files", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "workspace-file-generated-undo-")
  );
  const workspaceSlug = "demo-workspace";
  const sessionManager = new SessionManager();
  try {
    const session = sessionManager.createSession(
      "codexCli",
      workspaceRoot,
      undefined,
      { initiativeSlug: workspaceSlug, stage: "virtual_simulation" }
    );
    const artifactPath = `.codeai-hub/${workspaceSlug}/virtual_simulation/virtual-simulation.md`;
    await writeWorkspaceFile(workspaceRoot, artifactPath, "old\n");

    const result = await runWorkspaceFileWrite({
      content: "new",
      path: artifactPath,
      sessionId: session.id,
      sessionManager,
    });

    assert.equal(result.statusCode, 200);
    const ledger = await new WorkflowStepUndoLedgerStore({
      workspaceRoot,
      workspaceSlug,
    }).read();
    assert.equal(ledger?.entries[0]?.previousContent, "old\n");
    assert.equal(ledger?.entries[0]?.undoBehavior, "restore_previous");
    assert.equal(ledger?.entries[0]?.stage, "virtual_simulation");
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
