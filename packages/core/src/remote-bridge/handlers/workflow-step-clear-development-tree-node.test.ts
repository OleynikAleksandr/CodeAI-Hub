import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { SessionManager } from "../../session-manager";
import { readDevelopmentTreeSnapshot } from "./development-tree-snapshot";
import { clearDevelopmentTreeNode } from "./workflow-step-clear-development-tree-node";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const PART_ID = "finder-widget";
const CLUSTER_ID = "note-selection-cluster";
const STAGE = `development_tree/materialized/product-parts/${PART_ID}/clusters/${CLUSTER_ID}`;

const PART_CONTENT = `# Product Part: Finder Widget

## Identity

| Field | Value |
|-------|-------|
| Part ID | \`finder-widget\` |
| Purpose | Finder widget |

## Owned Clusters

### \`note-selection-cluster\`

**Purpose:** Note selection.

| \`module-id\` | Responsibility |
| --- | --- |
| \`latest-note-resolver\` | Resolve latest note |
`;

const git = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], {
    cwd: workspaceRoot,
  });
  return stdout.trim();
};

const writeText = async (
  workspaceRoot: string,
  relativePath: string,
  content: string
): Promise<void> => {
  const absolutePath = path.join(workspaceRoot, relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, "utf8");
};

const exists = async (absolutePath: string): Promise<boolean> => {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
};

const initializeMainWorkspace = async (
  workspaceRoot: string
): Promise<void> => {
  await git(workspaceRoot, ["init"]);
  await git(workspaceRoot, ["config", "user.email", "test@example.local"]);
  await git(workspaceRoot, ["config", "user.name", "Test"]);
  await writeText(workspaceRoot, "README.md", "# Demo\n");
  await writeText(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts/${PART_ID}.md`,
    PART_CONTENT
  );
  await writeText(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/.gitignore`,
    "runtime/\n"
  );
  await git(workspaceRoot, ["add", "."]);
  await git(workspaceRoot, ["commit", "-m", "test: initial"]);
};

const createClusterWorktree = async (
  workspaceRoot: string
): Promise<string> => {
  const worktreePath = path.join(
    `${workspaceRoot}.worktrees`,
    WORKSPACE_SLUG,
    "product-parts",
    PART_ID,
    "cluster-contracts",
    CLUSTER_ID
  );
  await git(workspaceRoot, [
    "worktree",
    "add",
    "-B",
    "codex/demo/finder-widget/note-selection-cluster",
    worktreePath,
    "HEAD",
  ]);
  return worktreePath;
};

const writeProjectedState = async (
  workspaceRoot: string,
  worktreePath: string
): Promise<void> => {
  await writeText(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/development-tree-product-parts/${PART_ID}.unlock-state.json`,
    `${JSON.stringify(
      {
        nodes: [
          {
            branchName: "codex/demo/finder-widget/note-selection-cluster",
            clusterId: CLUSTER_ID,
            id: `cluster:${PART_ID}/${CLUSTER_ID}`,
            kind: "cluster",
            modelBinding: { modelId: "gpt-5.4-mini", providerId: "codex" },
            partId: PART_ID,
            providerId: "codex",
            sessionId: "cluster-session-1",
            sessionStage: STAGE,
            startedAt: "2026-06-08T12:00:00.000Z",
            status: "unlocked",
            worktreePath,
          },
        ],
      },
      null,
      2
    )}\n`
  );
  await writeText(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/continuity/index.json`,
    `${JSON.stringify(
      {
        entries: [
          {
            dialogId: "cluster-session-1",
            providerId: "codex",
            providerSessionId: "cluster-session-1",
            rootSessionId: "cluster-session-1",
            stage: STAGE,
            updatedAt: "2026-06-08T12:00:00.000Z",
          },
        ],
        updatedAt: "2026-06-08T12:00:00.000Z",
        version: 1,
        workspaceSlug: WORKSPACE_SLUG,
      },
      null,
      2
    )}\n`
  );
  await writeText(
    workspaceRoot,
    `.codeai-hub/${WORKSPACE_SLUG}/continuity/${STAGE}/cluster-session-1/chain.json`,
    '{"segments":[]}\n'
  );
  await git(workspaceRoot, ["add", "."]);
  await git(workspaceRoot, ["commit", "-m", "test: projected cluster session"]);
};

test("clearDevelopmentTreeNode removes cluster worktree and resets projection", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "clear-devtree-node-")
  );
  try {
    await initializeMainWorkspace(workspaceRoot);
    const worktreePath = await createClusterWorktree(workspaceRoot);
    const worktreesRoot = `${workspaceRoot}.worktrees`;
    await writeFile(path.join(worktreesRoot, ".DS_Store"), "stale", "utf8");
    await writeProjectedState(workspaceRoot, worktreePath);
    const sessionManager = new SessionManager();
    const session = sessionManager.createSession(
      "codex",
      worktreePath,
      "cluster-session-1",
      {
        initiativeSlug: WORKSPACE_SLUG,
        stage: STAGE,
      }
    );
    const providerSessionPath = path.join(
      workspaceRoot,
      ".codeai-hub",
      WORKSPACE_SLUG,
      "runtime/providers/codex/home/sessions/2026/06/10",
      "rollout-cluster-session-1.jsonl"
    );
    const unifiedSessionPath = path.join(
      workspaceRoot,
      ".codeai-hub",
      WORKSPACE_SLUG,
      "runtime/sessions/unified/codex",
      "cluster-session-1-note-selection-cluster.jsonl"
    );
    const unifiedTranslationPath = path.join(
      workspaceRoot,
      ".codeai-hub",
      WORKSPACE_SLUG,
      "runtime/sessions/unified/codex",
      "cluster-session-1-note-selection-cluster.translations.jsonl"
    );
    const unrelatedUnifiedPath = path.join(
      workspaceRoot,
      ".codeai-hub",
      WORKSPACE_SLUG,
      "runtime/sessions/unified/codex",
      "other-product-part.jsonl"
    );
    await mkdir(path.dirname(providerSessionPath), { recursive: true });
    await mkdir(path.dirname(unifiedSessionPath), { recursive: true });
    await writeFile(providerSessionPath, "native session\n", "utf8");
    await writeFile(unifiedSessionPath, "unified session\n", "utf8");
    await writeFile(unifiedTranslationPath, "translation\n", "utf8");
    await writeFile(unrelatedUnifiedPath, "unrelated\n", "utf8");

    const result = await clearDevelopmentTreeNode(
      {
        target: { kind: "development_tree_node", workflowPath: STAGE },
        workspacePath: workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      },
      { sessionManager }
    );

    assert.equal(result.nodeId, `cluster:${PART_ID}/${CLUSTER_ID}`);
    assert.deepEqual(result.deletedSessionIds, [session.id]);
    assert.equal(await exists(worktreePath), false);
    assert.equal(await exists(worktreesRoot), false);
    assert.equal(await exists(providerSessionPath), false);
    assert.equal(await exists(unifiedSessionPath), false);
    assert.equal(await exists(unifiedTranslationPath), false);
    assert.equal(await exists(unrelatedUnifiedPath), true);
    assert.equal(await git(workspaceRoot, ["status", "--porcelain"]), "");

    const rawState = await readFile(
      path.join(
        workspaceRoot,
        `.codeai-hub/${WORKSPACE_SLUG}/workflow/managed/development-tree-product-parts/${PART_ID}.unlock-state.json`
      ),
      "utf8"
    );
    const state = JSON.parse(rawState) as {
      readonly nodes: readonly {
        readonly sessionId?: string;
        readonly status?: string;
        readonly worktreePath?: string;
      }[];
    };
    assert.equal(state.nodes[0]?.status, "waiting");
    assert.equal(state.nodes[0]?.sessionId, undefined);
    assert.equal(state.nodes[0]?.worktreePath, undefined);

    const snapshot = await readDevelopmentTreeSnapshot({
      generatedPartIds: [PART_ID],
      plannedPartIds: [PART_ID],
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    const cluster = snapshot.parts[0]?.clusters[0];
    assert.equal(cluster?.session, undefined);
    assert.equal(
      (cluster as { readonly coordination?: { readonly status?: string } })
        .coordination?.status,
      "waiting"
    );
  } finally {
    await rm(`${workspaceRoot}.worktrees`, { force: true, recursive: true });
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
