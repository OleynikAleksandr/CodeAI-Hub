import assert from "node:assert/strict";
import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { DevelopmentTreeSnapshot } from "../development-tree-types";
import { DevelopmentTreeFilesystemStructuratorFacade } from "./development-tree-filesystem-structurator-facade";

const createSnapshot = (): DevelopmentTreeSnapshot => ({
  parts: [
    {
      id: "local-runtime",
      status: "materialized",
      clusters: [
        {
          id: "orchestration",
          modules: [{ id: "workflow-state", title: "Workflow State" }],
        },
      ],
      standaloneModules: [{ id: "provider-bridge", title: "Provider Bridge" }],
    },
  ],
});

test("DevelopmentTreeFilesystemStructuratorFacade plans and applies materialized tree directories", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "devtree-facade-")
  );
  try {
    const facade = new DevelopmentTreeFilesystemStructuratorFacade();
    const result = await facade.materialize({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
      snapshot: createSnapshot(),
    });

    assert.equal(result.apply.conflicts.length, 0);
    assert.equal(result.apply.created.length, result.plan.directories.length);
    assert.equal(result.orphans.orphanRelativePaths.length, 0);
    for (const directory of result.plan.directories) {
      assert.equal((await stat(directory.absolutePath)).isDirectory(), true);
    }
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DevelopmentTreeFilesystemStructuratorFacade reports orphan summary behind facade", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "devtree-facade-")
  );
  try {
    const facade = new DevelopmentTreeFilesystemStructuratorFacade();
    const plan = facade.plan({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
      snapshot: createSnapshot(),
    });
    const orphanPath = `${plan.rootRelativePath}/product-parts/removed-part`;
    const result = await facade.materialize({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
      snapshot: createSnapshot(),
      existingRelativePaths: [
        plan.directories[0]?.relativePath ?? "",
        orphanPath,
        `${plan.rootRelativePath}/_orphaned/already-moved`,
      ],
    });

    assert.deepEqual(result.orphans.orphanRelativePaths, [orphanPath]);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
