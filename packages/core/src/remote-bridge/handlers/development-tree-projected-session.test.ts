import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { Logger } from "../../telemetry/logger";
import { readDevelopmentTreeSnapshot } from "./development-tree-snapshot";
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
  workspaceRoot: string
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
            worktreePath: "/tmp/ui-shell-layout-cluster",
          },
        ],
      },
      null,
      2
    )}\n`,
    "utf8"
  );
};

test("projected cluster sessions are visible from the main workspace", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "devtree-projected-session-")
  );
  try {
    await writePart(workspaceRoot);
    await writeProjectedUnlockState(workspaceRoot);

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
      "/tmp/ui-shell-layout-cluster"
    );

    const dialogs = await new DialogListService({
      logger: new Logger("error"),
    }).listDialogs({ workspaceRoot, workspaceSlug: "demo" });
    assert.equal(dialogs.length, 1);
    assert.equal(dialogs[0]?.dialogId, "cluster-session-1");
    assert.equal(dialogs[0]?.stage, cluster?.workflowPath);
    assert.equal(dialogs[0]?.modelBinding?.modelId, "gpt-5.4-mini");
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
