import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { buildSessionFilePath } from "@codeai-hub/unified-session";
import { Logger } from "../../telemetry/logger";
import { WORKFLOW_UNIFIED_SESSION_WORKSPACE_SLUG } from "../../unified-session/storage";
import { resolveWorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";
import { readDevelopmentTreeSnapshot } from "./development-tree-snapshot";
import { DialogHistoryService } from "./dialog-history-service";

const WORKSPACE_SLUG = "demo";
const PART_ID = "ui-shell";
const DIALOG_ID = "codex-runtime-part-session-1-ui-shell";
const RUNTIME_SESSION_ID = "runtime-part-session-1";
const STAGE = "development_tree/materialized/product-parts/ui-shell";

const writeText = async (
  root: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(root, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const writePart = async (workspaceRoot: string): Promise<void> => {
  await writeText(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts/${PART_ID}.md`,
    [
      "# Product Part: UI Shell",
      "",
      "## Identity",
      "",
      "| Field | Value |",
      "|-------|-------|",
      `| Part ID | \`${PART_ID}\` |`,
      "| Purpose | Primary user interface shell |",
      "",
    ].join("\n")
  );
};

const writeManagedState = async (
  workspaceRoot: string,
  worktreePath: string
): Promise<void> => {
  await writeText(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/development-tree-product-parts/${PART_ID}.json`,
    `${JSON.stringify(
      {
        partId: PART_ID,
        providerId: "codex",
        reviewState: "lane_started",
        schema: "codeai-product-part-development-brief-managed-v1",
        sessionId: RUNTIME_SESSION_ID,
        sessionStage: STAGE,
        updatedAt: "2026-06-08T12:02:00.000Z",
        worktreePath,
      },
      null,
      2
    )}\n`
  );
};

const writeWorktreeContinuity = async (worktreePath: string): Promise<void> => {
  await writeText(
    worktreePath,
    `.codeai-hub/${WORKSPACE_SLUG}/continuity/index.json`,
    `${JSON.stringify(
      {
        entries: [
          {
            dialogId: DIALOG_ID,
            latestSessionId: RUNTIME_SESSION_ID,
            providerId: "codex",
            providerSessionId: "provider-part-session-1",
            rootSessionId: DIALOG_ID,
            stage: STAGE,
            updatedAt: "2026-06-08T12:01:00.000Z",
          },
        ],
        updatedAt: "2026-06-08T12:01:00.000Z",
        version: 1,
        workspaceSlug: WORKSPACE_SLUG,
      },
      null,
      2
    )}\n`
  );
};

const writeWorktreeHistory = async (worktreePath: string): Promise<void> => {
  const capsule = resolveWorkspaceRuntimeCapsule({
    workspaceRoot: worktreePath,
    workspaceSlug: WORKSPACE_SLUG,
  });
  const historyPath = buildSessionFilePath({
    rootDirectory: capsule.sessionsRoot.absolutePath,
    workspaceSlug: WORKFLOW_UNIFIED_SESSION_WORKSPACE_SLUG,
    provider: "codex",
    sessionId: DIALOG_ID,
  });
  await mkdir(path.dirname(historyPath), { recursive: true });
  await writeFile(
    historyPath,
    [
      JSON.stringify({
        type: "session-open",
        timestamp: "2026-06-08T12:02:00.000Z",
        provider: "codex",
        sessionId: DIALOG_ID,
      }),
      JSON.stringify({
        type: "message",
        timestamp: "2026-06-08T12:03:00.000Z",
        provider: "codex",
        messageId: "product-part-message-1",
        role: "assistant",
        content: "Product Part lane brief ready for review.",
      }),
    ].join("\n"),
    "utf8"
  );
};

test("product part lane sessions are projected from worktree continuity", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "devtree-product-part-lane-session-")
  );
  const worktreePath = `${workspaceRoot}.worktrees/${WORKSPACE_SLUG}/product-parts/${PART_ID}/precode`;
  try {
    await writePart(workspaceRoot);
    await writeManagedState(workspaceRoot, worktreePath);
    await writeWorktreeContinuity(worktreePath);
    await writeWorktreeHistory(worktreePath);

    const snapshot = await readDevelopmentTreeSnapshot({
      generatedPartIds: [PART_ID],
      plannedPartIds: [PART_ID],
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    const part = snapshot.parts[0];
    assert.equal(part?.session?.dialogId, DIALOG_ID);
    assert.equal(part?.session?.providerSessionId, "provider-part-session-1");
    assert.equal(part?.session?.sessionId, RUNTIME_SESSION_ID);
    assert.equal(part?.session?.providerId, "codex");
    assert.equal(part?.lifecycle?.startState, "started");
    assert.equal(part?.lifecycle?.startable, false);

    const history = await new DialogHistoryService({
      logger: new Logger("error"),
    }).readHistory({
      dialogId: DIALOG_ID,
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    assert.equal(history.messages.length, 1);
    assert.equal(
      history.messages[0]?.content,
      "Product Part lane brief ready for review."
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
    await rm(worktreePath, { force: true, recursive: true });
  }
});
