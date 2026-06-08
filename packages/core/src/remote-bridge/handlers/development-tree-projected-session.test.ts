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
import { DialogListService } from "./dialog-list-service";

const PART_CONTENT = `# Product Part: UI Shell

## Identity

| Field | Value |
|-------|-------|
| Part ID | \`ui-shell\` |
| Purpose | Primary user interface shell |

## Owned Clusters

### \`layout-cluster\`

**Purpose:** Layout management.

| \`module-id\` | Responsibility |
| --- | --- |
| \`main-area\` | Core layout surface |
`;

const writePart = async (workspaceRoot: string): Promise<void> => {
  const partDir = path.join(
    workspaceRoot,
    ".codeai-hub/demo/diagram_modules/product-parts"
  );
  await mkdir(partDir, { recursive: true });
  await writeFile(path.join(partDir, "ui-shell.md"), PART_CONTENT, "utf8");
};

const writeProjectedUnlockState = async (
  workspaceRoot: string,
  worktreePath: string
): Promise<void> => {
  const statePath = path.join(
    workspaceRoot,
    ".codeai-hub/demo/workflow/managed/development-tree-product-parts/ui-shell.unlock-state.json"
  );
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(
    statePath,
    `${JSON.stringify(
      {
        nodes: [
          {
            branchName: "codex/development-tree/demo/ui-shell/layout-cluster",
            clusterId: "layout-cluster",
            id: "cluster:ui-shell/layout-cluster",
            kind: "cluster",
            modelBinding: {
              modelId: "gpt-5.4-mini",
              providerId: "codex",
              reasoningEffort: "medium",
              source: "continuity_inherited",
            },
            partId: "ui-shell",
            providerId: "codex",
            sessionId: "cluster-session-1",
            sessionStage:
              "development_tree/materialized/product-parts/ui-shell/clusters/layout-cluster",
            startedAt: "2026-06-08T12:00:00.000Z",
            status: "unlocked",
            worktreePath,
          },
        ],
      },
      null,
      2
    )}\n`,
    "utf8"
  );
};

const writeWorktreeCapsuleHistory = async (params: {
  readonly dialogId: string;
  readonly providerId: string;
  readonly workspaceSlug: string;
  readonly worktreePath: string;
}): Promise<void> => {
  const capsule = resolveWorkspaceRuntimeCapsule({
    workspaceRoot: params.worktreePath,
    workspaceSlug: params.workspaceSlug,
  });
  const historyPath = buildSessionFilePath({
    rootDirectory: capsule.sessionsRoot.absolutePath,
    workspaceSlug: WORKFLOW_UNIFIED_SESSION_WORKSPACE_SLUG,
    provider: params.providerId,
    sessionId: params.dialogId,
  });
  await mkdir(path.dirname(historyPath), { recursive: true });
  await writeFile(
    historyPath,
    [
      JSON.stringify({
        type: "session-open",
        timestamp: "2026-06-08T12:00:00.000Z",
        provider: params.providerId,
        sessionId: params.dialogId,
      }),
      JSON.stringify({
        type: "message",
        timestamp: "2026-06-08T12:01:00.000Z",
        provider: params.providerId,
        messageId: "cluster-message-1",
        role: "assistant",
        content: "Cluster contract draft accepted for review.",
      }),
    ].join("\n"),
    "utf8"
  );
};

test("projected cluster sessions are visible from the main workspace", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "devtree-projected-session-")
  );
  const worktreePath = `${workspaceRoot}.worktrees/ui-shell-layout-cluster`;
  try {
    await writePart(workspaceRoot);
    await writeProjectedUnlockState(workspaceRoot, worktreePath);
    await writeWorktreeCapsuleHistory({
      dialogId: "cluster-session-1",
      providerId: "codex",
      workspaceSlug: "demo",
      worktreePath,
    });

    const snapshot = await readDevelopmentTreeSnapshot({
      generatedPartIds: ["ui-shell"],
      plannedPartIds: ["ui-shell"],
      workspaceRoot,
      workspaceSlug: "demo",
    });
    const cluster = snapshot.parts[0]?.clusters[0];
    assert.equal(cluster?.session?.sessionId, "cluster-session-1");
    assert.equal(cluster?.session?.providerId, "codex");
    assert.equal(cluster?.lifecycle?.startState, "started");
    assert.equal(cluster?.lifecycle?.startable, false);
    assert.equal(
      (
        cluster as
          | {
              readonly coordination?: {
                readonly sessionId?: string;
                readonly worktreePath?: string;
              };
            }
          | undefined
      )?.coordination?.worktreePath,
      worktreePath
    );

    const dialogs = await new DialogListService({
      logger: new Logger("error"),
    }).listDialogs({ workspaceRoot, workspaceSlug: "demo" });
    assert.equal(dialogs.length, 1);
    assert.equal(dialogs[0]?.dialogId, "cluster-session-1");
    assert.equal(dialogs[0]?.stage, cluster?.workflowPath);
    assert.equal(dialogs[0]?.modelBinding?.modelId, "gpt-5.4-mini");
    assert.equal(
      (
        dialogs[0] as
          | {
              readonly worktreePath?: string;
            }
          | undefined
      )?.worktreePath,
      worktreePath
    );

    const history = await new DialogHistoryService({
      logger: new Logger("error"),
    }).readHistory({
      dialogId: "cluster-session-1",
      workspaceRoot,
      workspaceSlug: "demo",
    });
    assert.equal(history.messages.length, 1);
    assert.equal(
      history.messages[0]?.content,
      "Cluster contract draft accepted for review."
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
    await rm(worktreePath, { force: true, recursive: true });
  }
});
