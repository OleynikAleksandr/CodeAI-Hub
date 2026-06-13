import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type {
  DevelopmentTreeClusterNode,
  DevelopmentTreePartNode,
  DevelopmentTreeSnapshot,
} from "./development-tree-types";
import { applyDevelopmentTreeUserGateCursor } from "./development-tree-user-gate-cursor";

const WORKSPACE_SLUG = "finderwidget-test01";

const createCluster = (clusterId: string): DevelopmentTreeClusterNode => ({
  id: clusterId,
  modules: [],
  session: {
    dialogId: `${clusterId}-dialog`,
    providerId: "codexCli",
    providerSessionId: `${clusterId}-provider-session`,
    rootSessionId: `${clusterId}-root-session`,
    sessionId: `${clusterId}-session`,
    updatedAt: "2026-06-12T10:00:00.000Z",
  },
  workflowPath: `development_tree/materialized/product-parts/finder-widget/clusters/${clusterId}`,
});

const createPart = (
  partId: string,
  clusters: readonly DevelopmentTreeClusterNode[] = []
): DevelopmentTreePartNode => ({
  id: partId,
  clusters,
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

const createPlanState = (params: {
  readonly currentTaskId: string;
  readonly expectedCommitMessage: string;
  readonly planId: string;
}): string =>
  `${JSON.stringify(
    {
      schema: "codeai-plan-v1",
      executionScopeStatus: "ACTIVE",
      planId: params.planId,
      branch: "main",
      baseHead: "TBD",
      lastRecordedCommit: "TBD",
      currentTaskId: params.currentTaskId,
      expectedCommitMessage: params.expectedCommitMessage,
      debt: null,
    },
    null,
    2
  )}\n`;

const writeProductPartPlan = async (
  workspaceRoot: string,
  partId: string,
  state?: {
    readonly currentTaskId: string;
    readonly expectedCommitMessage: string;
  }
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
      createPlanState({
        currentTaskId:
          state?.currentTaskId ??
          `development-tree.product-part.${partId}.phase2.brief-review.task1`,
        expectedCommitMessage:
          state?.expectedCommitMessage ??
          `docs: accept ${partId} product part development brief`,
        planId: `development-tree-product-part-${partId}`,
      }).trimEnd(),
      "```",
      "<!-- codeai-plan-state:end -->",
      "",
    ].join("\n"),
    "utf8"
  );
};

const writeClusterPlan = async (
  workspaceRoot: string,
  partId: string,
  clusterId: string
): Promise<void> => {
  const planPath = path.join(
    workspaceRoot,
    "doc",
    "TODO",
    "stages",
    "development-tree",
    "product-parts",
    partId,
    "clusters",
    clusterId,
    "todo-plan.md"
  );
  await mkdir(path.dirname(planPath), { recursive: true });
  await writeFile(
    planPath,
    [
      "# Cluster Contract Plan",
      "",
      "<!-- codeai-plan-state:start -->",
      "```json",
      createPlanState({
        currentTaskId: `development-tree.cluster-contract.${partId}.${clusterId}.phase2.contract-review.task1`,
        expectedCommitMessage: `docs: accept ${clusterId} cluster contract`,
        planId: `development-tree-cluster-${clusterId}`,
      }).trimEnd(),
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

test("applyDevelopmentTreeUserGateCursor exposes lead order-plan review", async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "devtree-gate-"));
  try {
    await writeProductPartPlan(workspaceRoot, "finder-widget", {
      currentTaskId:
        "development-tree.product-part.finder-widget.phase4.order-plan-review.task1",
      expectedCommitMessage: "docs: accept lead development order plan",
    });

    const snapshot: DevelopmentTreeSnapshot = {
      leadProductPartId: "finder-widget",
      parts: [createPart("finder-widget")],
    };
    const result = await applyDevelopmentTreeUserGateCursor(snapshot, {
      generatedPartIds: ["finder-widget"],
      leadProductPartId: "finder-widget",
      plannedPartIds: ["finder-widget"],
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.activeUserGate?.nodeId, "product-part:finder-widget");
    assert.equal(
      result.activeUserGate?.reason,
      "product_part_order_plan_review_required"
    );
    assert.deepEqual(result.activeUserGate?.artifactPaths, [
      `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/finder-widget/DevelopmentOrderPlan.draft.md`,
      `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/finder-widget/DevelopmentOrderPlan.draft.json`,
    ]);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("applyDevelopmentTreeUserGateCursor exposes cluster contract review", async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "devtree-gate-"));
  try {
    const cluster = createCluster("note-selection-cluster");
    await writeClusterPlan(workspaceRoot, "finder-widget", cluster.id);

    const snapshot: DevelopmentTreeSnapshot = {
      leadProductPartId: "finder-widget",
      parts: [createPart("finder-widget", [cluster])],
    };
    const result = await applyDevelopmentTreeUserGateCursor(snapshot, {
      generatedPartIds: ["finder-widget"],
      leadProductPartId: "finder-widget",
      plannedPartIds: ["finder-widget"],
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(
      result.activeUserGate?.nodeId,
      "cluster:finder-widget/note-selection-cluster"
    );
    assert.equal(result.activeUserGate?.nodeKind, "cluster");
    assert.equal(result.activeUserGate?.clusterId, "note-selection-cluster");
    assert.equal(
      result.activeUserGate?.session?.sessionId,
      `${cluster.id}-session`
    );
    assert.equal(
      result.activeUserGate?.reason,
      "cluster_contract_review_required"
    );
    assert.ok(
      result.activeUserGate?.artifactPaths.includes(
        `.codeai-hub/${WORKSPACE_SLUG}/development_tree/materialized/product-parts/finder-widget/clusters/note-selection-cluster/ClusterFacadeContract.draft.md`
      )
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
