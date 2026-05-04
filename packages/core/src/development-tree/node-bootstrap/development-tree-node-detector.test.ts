import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createDevelopmentTreeMaterializedRoot } from "../filesystem-structurator/development-tree-filesystem-paths";
import { DevelopmentTreeFilesystemWatcher } from "./development-tree-filesystem-watcher";
import { DevelopmentTreeNodeDetector } from "./development-tree-node-detector";

const createMaterializedTree = async (workspaceRoot: string): Promise<void> => {
  const root = createDevelopmentTreeMaterializedRoot({
    workspaceRoot,
    workspaceSlug: "demo-workspace",
  });
  await mkdir(
    path.join(
      root.absolutePath,
      "product-parts/local-runtime/clusters/orchestration/modules/workflow-state"
    ),
    { recursive: true }
  );
  await mkdir(
    path.join(root.absolutePath, "product-parts/local-runtime/modules/bridge"),
    { recursive: true }
  );
  await mkdir(path.join(root.absolutePath, "product-parts/_orphaned/old"), {
    recursive: true,
  });
  await writeFile(
    path.join(root.absolutePath, "product-parts/local-runtime/readme.md"),
    "not a node",
    "utf8"
  );
};

test("DevelopmentTreeNodeDetector detects materialized Product Part, Cluster, and Module folders", async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "devtree-nodes-"));
  try {
    await createMaterializedTree(workspaceRoot);
    const root = createDevelopmentTreeMaterializedRoot({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    const nodes = await new DevelopmentTreeNodeDetector().detect({
      materializedRootAbsolutePath: root.absolutePath,
      materializedRootRelativePath: root.relativePath,
    });

    assert.deepEqual(
      nodes.map((node) => ({
        kind: node.kind,
        id: node.id,
        partId: node.partId,
        clusterId: node.clusterId,
      })),
      [
        {
          kind: "product_part",
          id: "local-runtime",
          partId: "local-runtime",
          clusterId: undefined,
        },
        {
          kind: "cluster",
          id: "orchestration",
          partId: "local-runtime",
          clusterId: "orchestration",
        },
        {
          kind: "module",
          id: "workflow-state",
          partId: "local-runtime",
          clusterId: "orchestration",
        },
        {
          kind: "module",
          id: "bridge",
          partId: "local-runtime",
          clusterId: undefined,
        },
      ]
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DevelopmentTreeFilesystemWatcher scans materialized root without Diagram Modules artifacts", async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "devtree-nodes-"));
  try {
    await createMaterializedTree(workspaceRoot);
    const nodes = await new DevelopmentTreeFilesystemWatcher().scan({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    assert.equal(nodes.length, 4);
    assert.equal(
      nodes.some(
        (node) =>
          node.kind === "module" &&
          node.partId === "local-runtime" &&
          node.id === "bridge"
      ),
      true
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
