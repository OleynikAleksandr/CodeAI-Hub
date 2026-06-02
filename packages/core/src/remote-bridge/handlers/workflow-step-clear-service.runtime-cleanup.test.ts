import assert from "node:assert/strict";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { Request, Response } from "express";
import { type Session, SessionManager } from "../../session-manager";
import { Logger } from "../../telemetry/logger";
import { resolveWorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";
import { createWorkflowRuntimeSessionRef } from "./workflow-step-clear-runtime-cleanup";
import { handleWorkflowStepClear } from "./workflow-step-clear-service";

const WORKSPACE_SLUG = "demo-workspace";

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

const writeText = async (filePath: string, content: string): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const createWorkflowSession = (
  sessionManager: SessionManager,
  options: {
    readonly providerId: string;
    readonly providerSessionId: string;
    readonly stage: string;
    readonly workspaceRoot: string;
  }
): Session =>
  sessionManager.createSession(
    options.providerId,
    options.workspaceRoot,
    options.providerSessionId,
    {
      initiativeSlug: WORKSPACE_SLUG,
      runSlug: options.stage.startsWith("development_tree/")
        ? "development-tree"
        : null,
      stage: options.stage,
    }
  );

const writeUnifiedHistory = async (
  workspaceRoot: string,
  session: Session,
  content = "workflow history"
): Promise<string> => {
  const capsule = resolveWorkspaceRuntimeCapsule({
    workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });
  const historyId = createWorkflowRuntimeSessionRef(session).historySessionId;
  const filePath = path.join(
    capsule.unifiedSessionsRoot.absolutePath,
    session.providerId,
    `${historyId}.jsonl`
  );
  await writeText(
    filePath,
    `${JSON.stringify({
      type: "session-open",
      provider: session.providerId,
      sessionId: historyId,
    })}\n${content}\n`
  );
  await writeText(
    filePath.replace(".jsonl", ".translations.jsonl"),
    '{"type":"message-translation"}\n'
  );
  return filePath;
};

test("workflow step clear removes unified and provider-native runtime session files", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "clear-runtime-sessions-")
  );
  const capsule = resolveWorkspaceRuntimeCapsule({
    workspaceRoot,
    workspaceSlug: WORKSPACE_SLUG,
  });
  const sessionManager = new SessionManager();
  const description = createWorkflowSession(sessionManager, {
    providerId: "codexCli",
    providerSessionId: "codex-description-provider-session",
    stage: "description",
    workspaceRoot,
  });
  const virtual = createWorkflowSession(sessionManager, {
    providerId: "codexCli",
    providerSessionId: "codex-virtual-provider-session",
    stage: "virtual_simulation",
    workspaceRoot,
  });
  const productPart = createWorkflowSession(sessionManager, {
    providerId: "claudeCodeCli",
    providerSessionId: "claude-product-part-provider-session",
    stage: "development_tree/materialized/product-parts/app-shell",
    workspaceRoot,
  });
  const gemini = createWorkflowSession(sessionManager, {
    providerId: "geminiCli",
    providerSessionId: "abcdef12-1111-2222-3333-4444556677ab",
    stage: "application_skeleton",
    workspaceRoot,
  });

  const descriptionHistoryPath = await writeUnifiedHistory(
    workspaceRoot,
    description
  );
  const virtualHistoryPath = await writeUnifiedHistory(workspaceRoot, virtual);
  const productPartHistoryPath = await writeUnifiedHistory(
    workspaceRoot,
    productPart,
    "Workflow path: development_tree/materialized/product-parts/app-shell"
  );
  const orphanProductPartHistoryPath = path.join(
    capsule.unifiedSessionsRoot.absolutePath,
    "codexCli",
    "codex-orphan-app-shell.jsonl"
  );
  await writeText(
    orphanProductPartHistoryPath,
    "Workflow path: development_tree/materialized/product-parts/app-shell\n"
  );

  const codexNativePath = path.join(
    capsule.providerHomes.codex.absolutePath,
    "sessions/2026/06/02",
    "rollout-codex-virtual-provider-session.jsonl"
  );
  const codexShellSnapshotPath = path.join(
    capsule.providerHomes.codex.absolutePath,
    "shell_snapshots",
    "codex-virtual-provider-session.123.sh"
  );
  const claudeNativePath = path.join(
    capsule.providerHomes.claude.absolutePath,
    ".claude/projects/demo",
    "claude-product-part-provider-session.jsonl"
  );
  const geminiNativePath = path.join(
    capsule.providerHomes.gemini.absolutePath,
    ".gemini/tmp/chats",
    "session-2026-06-02-abcdef12.json"
  );
  const codexAuthPath = path.join(
    capsule.providerHomes.codex.absolutePath,
    "auth.json"
  );
  await writeText(codexNativePath, "{}\n");
  await writeText(codexShellSnapshotPath, "#!/bin/sh\n");
  await writeText(
    claudeNativePath,
    "Workflow path: development_tree/materialized/product-parts/app-shell\n"
  );
  await writeText(
    geminiNativePath,
    JSON.stringify({ sessionId: gemini.providerSessionId, messages: [] })
  );
  await writeText(codexAuthPath, '{"token":"keep"}\n');

  const capture = createResponseCapture();
  await handleWorkflowStepClear(
    {
      body: {
        target: { kind: "workflow_stage", stage: "virtual_simulation" },
        workspacePath: workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      },
    } as Request,
    capture.response,
    {
      logger: new Logger("error"),
      resetWorkflowState: () => undefined,
      sessionManager,
      workflowBoundaryFacade: {
        restoreBoundary: async (params) => ({
          boundaryHash: "abc123",
          clearCommitHash: "def456",
          prunedStages: [params.stage],
          registryPath: "/tmp/boundaries.json",
          stage: params.stage,
        }),
      },
    }
  );

  assert.equal(capture.read().statusCode, 200);
  assert.equal(await fileExists(descriptionHistoryPath), true);
  assert.equal(await fileExists(virtualHistoryPath), false);
  assert.equal(
    await fileExists(
      virtualHistoryPath.replace(".jsonl", ".translations.jsonl")
    ),
    false
  );
  assert.equal(await fileExists(productPartHistoryPath), false);
  assert.equal(await fileExists(orphanProductPartHistoryPath), false);
  assert.equal(await fileExists(codexNativePath), false);
  assert.equal(await fileExists(codexShellSnapshotPath), false);
  assert.equal(await fileExists(claudeNativePath), false);
  assert.equal(await fileExists(geminiNativePath), false);
  assert.equal(await fileExists(codexAuthPath), true);
  assert.deepEqual(
    sessionManager.listSessions().map((session) => session.id),
    [description.id]
  );
  assert.deepEqual(
    (
      capture.read().payload as {
        readonly deletedSessionIds: readonly string[];
      }
    ).deletedSessionIds,
    [virtual.id, productPart.id, gemini.id]
  );

  await rm(workspaceRoot, { force: true, recursive: true });
});
