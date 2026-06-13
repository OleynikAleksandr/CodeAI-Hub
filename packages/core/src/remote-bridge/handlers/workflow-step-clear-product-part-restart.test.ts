import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { SessionManager } from "../../session-manager";
import {
  clearAndRestartProductPart,
  isProductPartRootClear,
} from "./workflow-step-clear-product-part-restart";

const WORKSPACE_SLUG = "demo-workspace";
const PRODUCT_PART_BRIEF_PLAN_RE =
  /Product Part Development Brief Managed TODO Plan/u;
const PRODUCT_PART_BRIEF_DRAFT_RE = /ProductPartDevelopmentBrief/u;
const PRECODE_BRANCH_RE = /codex\/test-precode-worktree/u;
const execFileAsync = promisify(execFile);

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

const runGit = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", [...args], {
    cwd: workspaceRoot,
  });
  return stdout;
};

const initializeGitWorkspace = async (workspaceRoot: string): Promise<void> => {
  await runGit(workspaceRoot, ["init"]);
  await runGit(workspaceRoot, ["config", "user.email", "test@example.local"]);
  await runGit(workspaceRoot, ["config", "user.name", "Test"]);
  await writeText(path.join(workspaceRoot, "README.md"), "# Test\n");
  await runGit(workspaceRoot, ["add", "."]);
  await runGit(workspaceRoot, ["commit", "-m", "test: initial workspace"]);
};

const writeAcceptedDiagramModulesArtifacts = async (params: {
  readonly partId: string;
  readonly siblingPartId: string;
  readonly workspaceRoot: string;
}): Promise<void> => {
  await writeText(
    path.join(
      params.workspaceRoot,
      `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts.index.md`
    ),
    [
      "# Product Parts Index",
      "",
      `- leadProductPartId: \`${params.partId}\``,
      `- productPartLeadershipOrder: \`${params.partId}\`, \`${params.siblingPartId}\``,
      "",
      `### Product Part: ${params.partId}`,
      "- Title: Target part",
      "- Purpose: Test target part.",
      "",
      `### Product Part: ${params.siblingPartId}`,
      "- Title: Sibling part",
      "- Purpose: Test sibling part.",
      "",
    ].join("\n")
  );
  for (const [partId, moduleId] of [
    [params.partId, "target-module"],
    [params.siblingPartId, "sibling-module"],
  ] as const) {
    await writeText(
      path.join(
        params.workspaceRoot,
        `.codeai-hub/${WORKSPACE_SLUG}/diagram_modules/product-parts/${partId}.md`
      ),
      [
        `# Product Part: ${partId}`,
        "",
        "## Identity",
        "",
        "| Field | Value |",
        "| ----- | ----- |",
        `| Part ID | \`${partId}\` |`,
        "",
        "## Standalone Modules",
        "",
        "| `module-id` | Responsibility |",
        "| --- | --- |",
        `| \`${moduleId}\` | Test responsibility. |`,
        "",
      ].join("\n")
    );
  }
  await runGit(params.workspaceRoot, ["add", "."]);
  await runGit(params.workspaceRoot, [
    "commit",
    "-m",
    "test: accepted diagram modules artifacts",
  ]);
};

test("Product Part root clear removes old session material and recreates agent plan/session", async () => {
  const tempRoot = await realpath(tmpdir());
  const workspaceRoot = await mkdtemp(
    path.join(tempRoot, "clear-product-part-")
  );
  const partId = "latest-note-search";
  const siblingPartId = "widget-display";
  const workflowPath = `development_tree/materialized/product-parts/${partId}`;
  const worktreesRoot = path.join(
    path.dirname(workspaceRoot),
    `${path.basename(workspaceRoot)}.worktrees`
  );
  const downstreamWorktreePath = path.join(
    worktreesRoot,
    WORKSPACE_SLUG,
    "product-parts",
    partId,
    "clusters",
    "note-selection-cluster",
    "contract"
  );
  const precodeWorktreePath = path.join(
    worktreesRoot,
    WORKSPACE_SLUG,
    "product-parts",
    partId,
    "precode"
  );
  const oldSessionProviderId = "old-product-part-provider-session";
  const sessionManager = new SessionManager();
  const oldSession = sessionManager.createSession(
    "codex",
    precodeWorktreePath,
    oldSessionProviderId,
    {
      initiativeSlug: WORKSPACE_SLUG,
      runSlug: "development-tree",
      stage: workflowPath,
    }
  );
  let downstreamSessionId = "";
  const productPartRoot = path.join(
    workspaceRoot,
    ".codeai-hub",
    WORKSPACE_SLUG,
    workflowPath
  );
  const siblingProductPartRoot = path.join(
    workspaceRoot,
    ".codeai-hub",
    WORKSPACE_SLUG,
    "development_tree/materialized/product-parts",
    siblingPartId
  );
  const planPath = path.join(
    workspaceRoot,
    "doc/TODO/stages/development-tree/product-parts",
    partId,
    "todo-plan.md"
  );
  const siblingPlanPath = path.join(
    workspaceRoot,
    "doc/TODO/stages/development-tree/product-parts",
    siblingPartId,
    "todo-plan.md"
  );
  const continuityPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    WORKSPACE_SLUG,
    "continuity",
    workflowPath,
    oldSession.id,
    "chain.json"
  );
  const continuityIndexPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    WORKSPACE_SLUG,
    "continuity/index.json"
  );
  const unifiedPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    WORKSPACE_SLUG,
    "runtime/sessions/unified/codex",
    `${oldSessionProviderId}.jsonl`
  );
  const staleUnifiedPath = path.join(
    workspaceRoot,
    ".codeai-hub",
    WORKSPACE_SLUG,
    "runtime/sessions/unified/codex",
    `codex-stale-${partId}.jsonl`
  );
  const providerNativePath = path.join(
    workspaceRoot,
    ".codeai-hub",
    WORKSPACE_SLUG,
    "runtime/providers/codex/home/sessions/2026/06/07",
    `rollout-${oldSessionProviderId}.jsonl`
  );

  try {
    await initializeGitWorkspace(workspaceRoot);
    await writeAcceptedDiagramModulesArtifacts({
      partId,
      siblingPartId,
      workspaceRoot,
    });
    await mkdir(path.dirname(precodeWorktreePath), { recursive: true });
    await runGit(workspaceRoot, [
      "worktree",
      "add",
      "-B",
      "codex/test-precode-worktree",
      precodeWorktreePath,
      "HEAD",
    ]);
    await mkdir(path.dirname(downstreamWorktreePath), { recursive: true });
    await runGit(workspaceRoot, [
      "worktree",
      "add",
      "-B",
      "codex/test-downstream-worktree",
      downstreamWorktreePath,
      "HEAD",
    ]);
    const downstreamSession = sessionManager.createSession(
      "codex",
      downstreamWorktreePath,
      "old-cluster-provider-session",
      {
        initiativeSlug: WORKSPACE_SLUG,
        runSlug: "development-tree",
        stage: `${workflowPath}/clusters/note-selection-cluster`,
      }
    );
    downstreamSessionId = downstreamSession.id;
    await mkdir(siblingProductPartRoot, { recursive: true });
    await writeText(planPath, "old product part plan\n");
    await writeText(
      path.join(productPartRoot, "ProductPartDevelopmentBrief.draft.md"),
      "old brief\n"
    );
    await writeText(
      path.join(productPartRoot, "DevelopmentOrderPlan.draft.md"),
      "old order\n"
    );
    await writeText(
      path.join(productPartRoot, "DevelopmentOrderPlan.draft.json"),
      "{}\n"
    );
    await writeText(
      path.join(productPartRoot, "AgentResearch.draft.json"),
      "{}\n"
    );
    await writeText(
      path.join(
        workspaceRoot,
        ".codeai-hub",
        WORKSPACE_SLUG,
        "workflow/managed/development-tree-product-parts",
        `${partId}.json`
      ),
      "{}\n"
    );
    await writeText(continuityPath, "{}\n");
    await writeText(
      continuityIndexPath,
      JSON.stringify({
        entries: [{ rootSessionId: oldSession.id, stage: workflowPath }],
        updatedAt: "2026-06-07T00:00:00.000Z",
        version: 1,
        workspaceSlug: WORKSPACE_SLUG,
      })
    );
    await writeText(unifiedPath, "{}\n");
    await writeText(staleUnifiedPath, "{}\n");
    await writeText(providerNativePath, "{}\n");
    await writeText(
      path.join(
        precodeWorktreePath,
        ".codeai-hub",
        WORKSPACE_SLUG,
        "runtime/sessions/unified/codex",
        `${oldSessionProviderId}.jsonl`
      ),
      "{}\n"
    );

    const result = await clearAndRestartProductPart(
      {
        target: { kind: "development_tree_node", workflowPath },
        workspacePath: workspaceRoot,
        workspaceSlug: WORKSPACE_SLUG,
      },
      {
        sessionManager,
        developmentTreeAgentGateway: {
          createSessionForWorkflow: async (options) =>
            sessionManager.createSession(
              options.providerId,
              options.workspacePath,
              "new-product-part-provider-session",
              options.context
            ),
          handleMessage: (sessionId, content) => {
            sessionManager.appendMessage(sessionId, "user", content);
            return Promise.resolve();
          },
        },
      }
    );

    const sessions = sessionManager.listSessions();
    const siblingSessions = sessions.filter(
      (session) =>
        session.stage ===
        `development_tree/materialized/product-parts/${siblingPartId}`
    );
    assert.equal(
      isProductPartRootClear({ kind: "development_tree_node", workflowPath }),
      true
    );
    assert.deepEqual(
      [...result.clearedSessions.deletedSessionIds].sort(),
      [downstreamSessionId, oldSession.id].sort()
    );
    assert.equal(sessions.length, 1);
    assert.equal(siblingSessions.length, 0);
    assert.equal(sessions[0]?.stage, workflowPath);
    assert.equal(sessions[0]?.workspacePath, precodeWorktreePath);
    assert.deepEqual(result.restart.bootstrapSessionIds, [sessions[0]?.id]);
    assert.deepEqual(
      [...result.restart.deletedWorktreePaths].sort(),
      [
        path.relative(workspaceRoot, downstreamWorktreePath),
        path.relative(workspaceRoot, precodeWorktreePath),
      ].sort()
    );
    assert.equal(await fileExists(downstreamWorktreePath), false);
    assert.equal(await fileExists(precodeWorktreePath), true);
    assert.equal(
      (
        await runGit(workspaceRoot, ["worktree", "list", "--porcelain"])
      ).includes(downstreamWorktreePath),
      false
    );
    assert.equal(
      PRECODE_BRANCH_RE.test(await runGit(workspaceRoot, ["branch", "--list"])),
      false
    );
    assert.equal(await fileExists(providerNativePath), false);
    assert.equal(await fileExists(unifiedPath), false);
    assert.equal(await fileExists(staleUnifiedPath), false);
    assert.equal(await fileExists(continuityPath), false);
    assert.equal(
      (await readFile(continuityIndexPath, "utf8")).includes(workflowPath),
      false
    );
    assert.equal(await fileExists(planPath), false);
    assert.match(
      await readFile(
        path.join(
          precodeWorktreePath,
          "doc/TODO/stages/development-tree/product-parts",
          partId,
          "todo-plan.md"
        ),
        "utf8"
      ),
      PRODUCT_PART_BRIEF_PLAN_RE
    );
    assert.match(
      await readFile(
        path.join(
          precodeWorktreePath,
          ".codeai-hub",
          WORKSPACE_SLUG,
          workflowPath,
          "ProductPartDevelopmentBrief.draft.md"
        ),
        "utf8"
      ),
      PRODUCT_PART_BRIEF_DRAFT_RE
    );
    assert.deepEqual(result.restart.deletedProductPartPlanPaths, [
      `doc/TODO/stages/development-tree/product-parts/${partId}`,
    ]);
    assert.deepEqual(result.restart.recreatedProductPartPlanPaths, [
      `doc/TODO/stages/development-tree/product-parts/${partId}/todo-plan.md`,
    ]);
    assert.deepEqual(result.restart.recreatedDraftPaths, [
      `.codeai-hub/${WORKSPACE_SLUG}/${workflowPath}/ProductPartDevelopmentBrief.draft.md`,
    ]);
    assert.equal(await fileExists(siblingPlanPath), false);
    assert.equal(
      await fileExists(
        path.join(
          siblingProductPartRoot,
          "ProductPartDevelopmentBrief.draft.md"
        )
      ),
      false
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
    await rm(worktreesRoot, { force: true, recursive: true });
  }
});
