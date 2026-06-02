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
    kind: "cluster",
    partId: "local-runtime",
    clusterId: "orchestration",
    moduleId: undefined,
    relativePath: `${rootRelativePath}/product-parts/local-runtime/clusters/orchestration`,
  },
  {
    kind: "module",
    partId: "local-runtime",
    clusterId: "orchestration",
    moduleId: "workflow-state",
    relativePath: `${rootRelativePath}/product-parts/local-runtime/clusters/orchestration/modules/workflow-state`,
  },
  {
    kind: "module",
    partId: "local-runtime",
    clusterId: "orchestration",
    moduleId: "session-router",
    relativePath: `${rootRelativePath}/product-parts/local-runtime/clusters/orchestration/modules/session-router`,
  },
  {
    kind: "module",
    partId: "local-runtime",
    clusterId: undefined,
    moduleId: "provider-bridge",
    relativePath: `${rootRelativePath}/product-parts/local-runtime/modules/provider-bridge`,
  },
  {
    kind: "product_part",
    partId: "project-manager",
    clusterId: undefined,
    moduleId: undefined,
    relativePath: `${rootRelativePath}/product-parts/project-manager`,
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
    plan.directories.some(
      (entry) =>
        entry.partId === "project-manager" && entry.kind === "product_part"
    ),
    true
  );
  assert.equal(
    plan.directories.some((entry) =>
      entry.relativePath.includes("lead-product-part-orchestration")
    ),
    false
  );
  assert.equal(
    plan.directories.some(
      (entry) =>
        entry.relativePath.endsWith("/workers") ||
        entry.relativePath.endsWith("/integration")
    ),
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
