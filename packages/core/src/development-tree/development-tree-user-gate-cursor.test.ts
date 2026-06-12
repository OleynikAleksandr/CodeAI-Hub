import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type {
  DevelopmentTreePartNode,
  DevelopmentTreeSnapshot,
} from "./development-tree-types";
import { applyDevelopmentTreeUserGateCursor } from "./development-tree-user-gate-cursor";

const WORKSPACE_SLUG = "finderwidget-test01";

const createPart = (partId: string): DevelopmentTreePartNode => ({
  id: partId,
  clusters: [],
  session: {
    dialogId: `${partId}-dialog`,
    providerId: "codexCli",
    providerSessionId: `${partId}-provider-session`,
    rootSessionId: `${partId}-root-session`,
    sessionId: `${partId}-session`,
    updatedAt: "2026-06-12T10:00:00.000Z",
  },
  standaloneModules: [],
  status: "materialized",
  workflowPath: `development_tree/materialized/product-parts/${partId}`,
});

const createPlanState = (partId: string): string =>
  `${JSON.stringify(
    {
      schema: "codeai-plan-v1",
      executionScopeStatus: "ACTIVE",
      planId: `development-tree-product-part-${partId}`,
      branch: "main",
      baseHead: "TBD",
      lastRecordedCommit: "TBD",
      currentTaskId: `development-tree.product-part.${partId}.phase2.brief-review.task1`,
      expectedCommitMessage: `docs: accept ${partId} product part development brief`,
      debt: null,
    },
    null,
    2
  )}\n`;

const writeProductPartPlan = async (
  workspaceRoot: string,
  partId: string
): Promise<void> => {
  const planPath = path.join(
    workspaceRoot,
    "doc",
    "TODO",
    "stages",
    "development-tree",
    "product-parts",
    partId,
    "todo-plan.md"
  );
  await mkdir(path.dirname(planPath), { recursive: true });
  await writeFile(
    planPath,
    [
      "# Product Part Plan",
      "",
      "<!-- codeai-plan-state:start -->",
      "```json",
      createPlanState(partId).trimEnd(),
      "```",
      "<!-- codeai-plan-state:end -->",
      "",
    ].join("\n"),
    "utf8"
  );
};

test("applyDevelopmentTreeUserGateCursor activates secondary brief before lead brief", async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "devtree-gate-"));
  try {
    await writeProductPartPlan(workspaceRoot, "finder-widget");
    await writeProductPartPlan(workspaceRoot, "finder-widget-shell");

    const snapshot: DevelopmentTreeSnapshot = {
      leadProductPartId: "finder-widget",
      parts: [createPart("finder-widget"), createPart("finder-widget-shell")],
      productPartLeadershipOrder: ["finder-widget", "finder-widget-shell"],
    };

    const result = await applyDevelopmentTreeUserGateCursor(snapshot, {
      generatedPartIds: ["finder-widget", "finder-widget-shell"],
      leadProductPartId: "finder-widget",
      plannedPartIds: ["finder-widget", "finder-widget-shell"],
      productPartLeadershipOrder: ["finder-widget", "finder-widget-shell"],
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.activeUserGate?.partId, "finder-widget-shell");
    assert.equal(result.activeUserGate?.status, "active");
    assert.equal(result.activeUserGate?.inputLocked, false);
    assert.equal(
      result.activeUserGate?.session?.sessionId,
      "finder-widget-shell-session"
    );
    assert.equal(result.queuedUserGates?.length, 1);
    assert.equal(result.queuedUserGates?.[0]?.partId, "finder-widget");
    assert.equal(result.queuedUserGates?.[0]?.status, "queued");
    assert.equal(result.queuedUserGates?.[0]?.inputLocked, true);
    assert.equal(
      result.queuedUserGates?.[0]?.inputLockReason,
      "Another user gate is active."
    );

    const leadPart = result.parts.find((part) => part.id === "finder-widget");
    const secondaryPart = result.parts.find(
      (part) => part.id === "finder-widget-shell"
    );
    assert.equal(leadPart?.userGate?.status, "queued");
    assert.equal(secondaryPart?.userGate?.status, "active");
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
