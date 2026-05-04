import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createDevelopmentTreeMaterializedRoot } from "../filesystem-structurator/development-tree-filesystem-paths";
import { DevelopmentTreeNodeBootstrapFacade } from "./development-tree-node-bootstrap-facade";

const createModuleFolder = async (
  workspaceRoot: string,
  moduleId: string
): Promise<void> => {
  const root = createDevelopmentTreeMaterializedRoot({
    workspaceRoot,
    workspaceSlug: "demo-workspace",
  });
  await mkdir(
    path.join(
      root.absolutePath,
      "product-parts/local-runtime/modules",
      moduleId
    ),
    { recursive: true }
  );
};

test("DevelopmentTreeNodeBootstrapFacade consumes each materialized node once", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "node-bootstrap-")
  );
  try {
    await createModuleFolder(workspaceRoot, "provider-bridge");
    const facade = new DevelopmentTreeNodeBootstrapFacade();

    const first = await facade.consumeNewNodes({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });
    const second = await facade.consumeNewNodes({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    assert.deepEqual(
      first.newNodes.map((node) => `${node.kind}:${node.id}`),
      ["product_part:local-runtime", "module:provider-bridge"]
    );
    assert.equal(first.processedCount, 2);
    assert.deepEqual(second.newNodes, []);
    assert.equal(second.processedCount, 2);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DevelopmentTreeNodeBootstrapFacade only returns newly added folders after first scan", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "node-bootstrap-")
  );
  try {
    await createModuleFolder(workspaceRoot, "provider-bridge");
    const facade = new DevelopmentTreeNodeBootstrapFacade();
    await facade.consumeNewNodes({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    await createModuleFolder(workspaceRoot, "settings-store");
    const next = await facade.consumeNewNodes({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
    });

    assert.deepEqual(
      next.newNodes.map((node) => `${node.kind}:${node.id}`),
      ["module:settings-store"]
    );
    assert.equal(next.processedCount, 3);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
