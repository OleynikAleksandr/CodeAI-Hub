import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { DevelopmentTreeSnapshot } from "../development-tree-types";
import { DevelopmentTreeFilesystemPathPlanner } from "./development-tree-filesystem-path-planner";

const createSnapshot = (): DevelopmentTreeSnapshot => ({
  leadProductPartId: "local-runtime",
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
  productPartLeadershipOrder: ["local-runtime", "project-manager"],
});

const createExpectedEntries = (rootRelativePath: string) => [
  {
    kind: "product_part",
    partId: "local-runtime",
    clusterId: undefined,
    moduleId: undefined,
    relativePath: `${rootRelativePath}/product-parts/local-runtime`,
  },
  {
    kind: "lead_orchestration",
    partId: "local-runtime",
    clusterId: undefined,
    moduleId: undefined,
    relativePath: `${rootRelativePath}/product-parts/local-runtime/lead-product-part-orchestration`,
  },
  {
    kind: "contract_graph",
    partId: "local-runtime",
    clusterId: undefined,
    moduleId: undefined,
    relativePath: `${rootRelativePath}/product-parts/local-runtime/lead-product-part-orchestration/contract-graph`,
  },
  {
    kind: "cross_part_contracts",
    partId: "local-runtime",
    clusterId: undefined,
    moduleId: undefined,
    relativePath: `${rootRelativePath}/product-parts/local-runtime/lead-product-part-orchestration/cross-part-contracts`,
  },
  {
    kind: "shared_interfaces",
    partId: "local-runtime",
    clusterId: undefined,
    moduleId: undefined,
    relativePath: `${rootRelativePath}/product-parts/local-runtime/lead-product-part-orchestration/shared-interfaces`,
  },
  {
    kind: "execution_waves",
    partId: "local-runtime",
    clusterId: undefined,
    moduleId: undefined,
    relativePath: `${rootRelativePath}/product-parts/local-runtime/lead-product-part-orchestration/execution-waves`,
  },
  {
    kind: "cluster",
    partId: "local-runtime",
    clusterId: "orchestration",
    moduleId: undefined,
    relativePath: `${rootRelativePath}/product-parts/local-runtime/clusters/orchestration`,
  },
  {
    kind: "workers",
    partId: "local-runtime",
    clusterId: "orchestration",
    moduleId: undefined,
    relativePath: `${rootRelativePath}/product-parts/local-runtime/clusters/orchestration/workers`,
  },
  {
    kind: "integration",
    partId: "local-runtime",
    clusterId: "orchestration",
    moduleId: undefined,
    relativePath: `${rootRelativePath}/product-parts/local-runtime/clusters/orchestration/integration`,
  },
  {
    kind: "module",
    partId: "local-runtime",
    clusterId: "orchestration",
    moduleId: "workflow-state",
    relativePath: `${rootRelativePath}/product-parts/local-runtime/clusters/orchestration/modules/workflow-state`,
  },
  {
    kind: "workers",
    partId: "local-runtime",
    clusterId: "orchestration",
    moduleId: "workflow-state",
    relativePath: `${rootRelativePath}/product-parts/local-runtime/clusters/orchestration/modules/workflow-state/workers`,
  },
  {
    kind: "integration",
    partId: "local-runtime",
    clusterId: "orchestration",
    moduleId: "workflow-state",
    relativePath: `${rootRelativePath}/product-parts/local-runtime/clusters/orchestration/modules/workflow-state/integration`,
  },
  {
    kind: "module",
    partId: "local-runtime",
    clusterId: "orchestration",
    moduleId: "session-router",
    relativePath: `${rootRelativePath}/product-parts/local-runtime/clusters/orchestration/modules/session-router`,
  },
  {
    kind: "workers",
    partId: "local-runtime",
    clusterId: "orchestration",
    moduleId: "session-router",
    relativePath: `${rootRelativePath}/product-parts/local-runtime/clusters/orchestration/modules/session-router/workers`,
  },
  {
    kind: "integration",
    partId: "local-runtime",
    clusterId: "orchestration",
    moduleId: "session-router",
    relativePath: `${rootRelativePath}/product-parts/local-runtime/clusters/orchestration/modules/session-router/integration`,
  },
  {
    kind: "module",
    partId: "local-runtime",
    clusterId: undefined,
    moduleId: "provider-bridge",
    relativePath: `${rootRelativePath}/product-parts/local-runtime/modules/provider-bridge`,
  },
  {
    kind: "workers",
    partId: "local-runtime",
    clusterId: undefined,
    moduleId: "provider-bridge",
    relativePath: `${rootRelativePath}/product-parts/local-runtime/modules/provider-bridge/workers`,
  },
  {
    kind: "integration",
    partId: "local-runtime",
    clusterId: undefined,
    moduleId: "provider-bridge",
    relativePath: `${rootRelativePath}/product-parts/local-runtime/modules/provider-bridge/integration`,
  },
];

const sortByRelativePath = <T extends { readonly relativePath: string }>(
  entries: readonly T[]
): T[] =>
  [...entries].sort((left, right) =>
    left.relativePath.localeCompare(right.relativePath)
  );

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
    sortByRelativePath(
      plan.directories.map((entry) => ({
        kind: entry.kind,
        partId: entry.partId,
        clusterId: entry.clusterId,
        moduleId: entry.moduleId,
        relativePath: entry.relativePath,
      }))
    ),
    sortByRelativePath([
      ...createExpectedEntries(
        ".codeai-hub/demo-workspace/development_tree/materialized"
      ),
      ...createExpectedEntries("doc/TODO/stages/development-tree"),
    ])
  );
  assert.equal(
    plan.directories.some((entry) => entry.partId === "project-manager"),
    false
  );
});

test("DevelopmentTreeFilesystemPathPlanner keeps absolute paths under planned roots", () => {
  const workspaceRoot = path.join(os.tmpdir(), "codeai-hub-planner");
  const planner = new DevelopmentTreeFilesystemPathPlanner();
  const plan = planner.plan({
    workspaceRoot,
    workspaceSlug: "demo-workspace",
    snapshot: createSnapshot(),
  });

  const plannedRoots = [
    plan.rootAbsolutePath,
    path.join(workspaceRoot, "doc/TODO/stages/development-tree"),
  ];
  for (const entry of plan.directories) {
    assert.equal(
      plannedRoots.some((root) =>
        entry.absolutePath.startsWith(`${root}${path.sep}`)
      ),
      true
    );
  }
});
