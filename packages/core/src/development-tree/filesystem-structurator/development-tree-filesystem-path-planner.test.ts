import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { DevelopmentTreeSnapshot } from "../development-tree-types";
import { DevelopmentTreeFilesystemPathPlanner } from "./development-tree-filesystem-path-planner";

const createSnapshot = (): DevelopmentTreeSnapshot => ({
  parts: [
    {
      id: "local-runtime",
      status: "materialized",
      clusters: [
        {
          id: "orchestration",
          modules: [
            { id: "workflow-state", title: "Workflow State" },
            { id: "session-router", title: "Session Router" },
          ],
        },
      ],
      standaloneModules: [{ id: "provider-bridge", title: "Provider Bridge" }],
    },
    {
      id: "project-manager",
      status: "skeleton",
      clusters: [],
      standaloneModules: [],
    },
  ],
});

test("DevelopmentTreeFilesystemPathPlanner creates neutral materialized P/C/M paths", () => {
  const workspaceRoot = path.join(os.tmpdir(), "codeai-hub-planner");
  const planner = new DevelopmentTreeFilesystemPathPlanner();
  const plan = planner.plan({
    workspaceRoot,
    workspaceSlug: "demo-workspace",
    snapshot: createSnapshot(),
  });

  assert.equal(
    plan.rootRelativePath,
    ".codeai-hub/demo-workspace/development_tree/materialized"
  );
  assert.equal(
    plan.rootAbsolutePath,
    path.join(
      workspaceRoot,
      ".codeai-hub/demo-workspace/development_tree/materialized"
    )
  );
  assert.deepEqual(
    plan.directories.map((entry) => ({
      kind: entry.kind,
      partId: entry.partId,
      clusterId: entry.clusterId,
      moduleId: entry.moduleId,
      relativePath: entry.relativePath,
    })),
    [
      {
        kind: "product_part",
        partId: "local-runtime",
        clusterId: undefined,
        moduleId: undefined,
        relativePath:
          ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/local-runtime",
      },
      {
        kind: "cluster",
        partId: "local-runtime",
        clusterId: "orchestration",
        moduleId: undefined,
        relativePath:
          ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/local-runtime/clusters/orchestration",
      },
      {
        kind: "module",
        partId: "local-runtime",
        clusterId: "orchestration",
        moduleId: "workflow-state",
        relativePath:
          ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/local-runtime/clusters/orchestration/modules/workflow-state",
      },
      {
        kind: "workers",
        partId: "local-runtime",
        clusterId: "orchestration",
        moduleId: "workflow-state",
        relativePath:
          ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/local-runtime/clusters/orchestration/modules/workflow-state/workers",
      },
      {
        kind: "integration",
        partId: "local-runtime",
        clusterId: "orchestration",
        moduleId: "workflow-state",
        relativePath:
          ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/local-runtime/clusters/orchestration/modules/workflow-state/integration",
      },
      {
        kind: "module",
        partId: "local-runtime",
        clusterId: "orchestration",
        moduleId: "session-router",
        relativePath:
          ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/local-runtime/clusters/orchestration/modules/session-router",
      },
      {
        kind: "workers",
        partId: "local-runtime",
        clusterId: "orchestration",
        moduleId: "session-router",
        relativePath:
          ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/local-runtime/clusters/orchestration/modules/session-router/workers",
      },
      {
        kind: "integration",
        partId: "local-runtime",
        clusterId: "orchestration",
        moduleId: "session-router",
        relativePath:
          ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/local-runtime/clusters/orchestration/modules/session-router/integration",
      },
      {
        kind: "module",
        partId: "local-runtime",
        clusterId: undefined,
        moduleId: "provider-bridge",
        relativePath:
          ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/local-runtime/modules/provider-bridge",
      },
      {
        kind: "workers",
        partId: "local-runtime",
        clusterId: undefined,
        moduleId: "provider-bridge",
        relativePath:
          ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/local-runtime/modules/provider-bridge/workers",
      },
      {
        kind: "integration",
        partId: "local-runtime",
        clusterId: undefined,
        moduleId: "provider-bridge",
        relativePath:
          ".codeai-hub/demo-workspace/development_tree/materialized/product-parts/local-runtime/modules/provider-bridge/integration",
      },
    ]
  );
  assert.equal(
    plan.directories.some((entry) => entry.partId === "project-manager"),
    false
  );
});

test("DevelopmentTreeFilesystemPathPlanner keeps absolute paths under materialized root", () => {
  const workspaceRoot = path.join(os.tmpdir(), "codeai-hub-planner");
  const planner = new DevelopmentTreeFilesystemPathPlanner();
  const plan = planner.plan({
    workspaceRoot,
    workspaceSlug: "demo-workspace",
    snapshot: createSnapshot(),
  });

  for (const entry of plan.directories) {
    assert.equal(
      entry.absolutePath.startsWith(`${plan.rootAbsolutePath}${path.sep}`),
      true
    );
  }
});
