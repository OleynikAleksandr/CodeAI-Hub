import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { Request, Response } from "express";
import { SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import { handleWorkflowStepClear } from "./workflow-step-clear-service";

const WORKSPACE_SLUG = "demo-workspace";

const writeText = async (filePath: string): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, "{}\n", "utf8");
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

test("workflow step clear preserves standalone workspace chat sessions and histories", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "clear-standalone-"));
  const sessionManager = new SessionManager();
  const workflowSession = sessionManager.createSession(
    "codex",
    workspaceRoot,
    "workflow-description-provider-session",
    { initiativeSlug: WORKSPACE_SLUG, stage: "description" }
  );
  const standaloneSession = sessionManager.createSession(
    "codex",
    workspaceRoot,
    "description-standalone-provider-session",
    { initiativeSlug: null, stage: null }
  );
  const workflowHistoryPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    WORKSPACE_SLUG,
    "runtime/sessions/unified/codex",
    "workflow-description-provider-session-description.jsonl"
  );
  const legacyStandaloneHistoryPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    WORKSPACE_SLUG,
    "runtime/sessions/unified/codex",
    "description-standalone-provider-session.jsonl"
  );
  const standaloneHistoryPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    "sessions",
    "standalone/codex",
    "description-standalone-provider-session.jsonl"
  );
  let payload: unknown = null;
  const response = {
    json(nextPayload: unknown) {
      payload = nextPayload;
      return this;
    },
    status() {
      return this;
    },
  } as unknown as Response;

  try {
    await writeText(workflowHistoryPath);
    await writeText(legacyStandaloneHistoryPath);
    await writeText(standaloneHistoryPath);

    await handleWorkflowStepClear(
      {
        body: {
          target: { kind: "workflow_stage", stage: "description" },
          workspacePath: workspaceRoot,
          workspaceSlug: WORKSPACE_SLUG,
        },
      } as Request,
      response,
      {
        logger: new Logger("error"),
        resetWorkflowState: () => undefined,
        sessionManager,
        workflowBoundaryFacade: {
          restoreBoundary: (params) =>
            Promise.resolve({
              boundaryHash: "boundary",
              clearCommitHash: "clear",
              prunedStages: [params.stage],
              registryPath: "",
              stage: params.stage,
            }),
        },
      }
    );

    assert.deepEqual(
      (payload as { readonly deletedSessionIds: readonly string[] })
        .deletedSessionIds,
      [workflowSession.id]
    );
    assert.equal(sessionManager.getSession(standaloneSession.id)?.stage, null);
    assert.equal(await fileExists(workflowHistoryPath), false);
    assert.equal(await fileExists(legacyStandaloneHistoryPath), true);
    assert.equal(await fileExists(standaloneHistoryPath), true);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
