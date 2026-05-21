import assert from "node:assert/strict";
import test from "node:test";
import { resolveInitialDevelopmentTreeExpansion } from "./workspace-tree-diagram-branch-nodes";
import type { TreeNode } from "./workspace-tree-model";

test("resolveInitialDevelopmentTreeExpansion opens the first Product Part and Cluster", () => {
  const nodes: readonly TreeNode[] = [
    {
      id: "devtree:ui-shell",
      label: "ui-shell",
      status: "draft",
      visualDepth: 0,
      nodeType: "product-part",
      isCollapsible: true,
      children: [
        {
          id: "devtree:ui-shell:layout-cluster",
          label: "layout-cluster",
          status: "todo",
          visualDepth: 1,
          nodeType: "cluster",
          isCollapsible: true,
        },
      ],
    },
  ];

  assert.deepEqual(resolveInitialDevelopmentTreeExpansion(nodes), {
    partId: "devtree:ui-shell",
    clusterId: "devtree:ui-shell:layout-cluster",
  });
});
