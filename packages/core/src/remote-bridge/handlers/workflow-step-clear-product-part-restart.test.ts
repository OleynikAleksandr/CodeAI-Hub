import assert from "node:assert/strict";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { SessionManager } from "../../session-manager";
import {
  clearAndRestartProductPart,
  isProductPartRootClear,
} from "./workflow-step-clear-product-part-restart";

const WORKSPACE_SLUG = "demo-workspace";
const PRODUCT_PART_BRIEF_PLAN_RE =
  /Product Part Development Brief Managed TODO Plan/u;
const PRODUCT_PART_BRIEF_DRAFT_RE = /ProductPartDevelopmentBrief/u;

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

test("Product Part root clear removes old session material and recreates agent plan/session", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "clear-product-part-")
  );
  const partId = "latest-note-search";
  const siblingPartId = "widget-display";
  const workflowPath = `development_tree/materialized/product-parts/${partId}`;
  const oldSessionProviderId = "old-product-part-provider-session";
  const sessionManager = new SessionManager();
  const oldSession = sessionManager.createSession(
    "codex",
    workspaceRoot,
    oldSessionProviderId,
    {
      initiativeSlug: WORKSPACE_SLUG,
      runSlug: "development-tree",
      stage: workflowPath,
    }
  );
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
  const providerNativePath = path.join(
    workspaceRoot,
    ".codeai-hub",
    WORKSPACE_SLUG,
    "runtime/providers/codex/home/sessions/2026/06/07",
    `rollout-${oldSessionProviderId}.jsonl`
  );

  try {
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
    await writeText(providerNativePath, "{}\n");

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
    assert.deepEqual(result.clearedSessions.deletedSessionIds, [oldSession.id]);
    assert.equal(sessions.length, 1);
    assert.equal(siblingSessions.length, 0);
    assert.equal(sessions[0]?.stage, workflowPath);
    assert.deepEqual(result.restart.bootstrapSessionIds, [sessions[0]?.id]);
    assert.equal(await fileExists(providerNativePath), false);
    assert.equal(await fileExists(unifiedPath), false);
    assert.equal(await fileExists(continuityPath), false);
    assert.equal(
      (await readFile(continuityIndexPath, "utf8")).includes(workflowPath),
      false
    );
    assert.match(await readFile(planPath, "utf8"), PRODUCT_PART_BRIEF_PLAN_RE);
    assert.match(
      await readFile(
        path.join(productPartRoot, "ProductPartDevelopmentBrief.draft.md"),
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
  }
});
