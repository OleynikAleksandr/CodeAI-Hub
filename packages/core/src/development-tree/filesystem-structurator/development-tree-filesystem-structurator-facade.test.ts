import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, stat, writeFile } from "node:fs/promises";
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

const writeSkeletonMap = async (workspaceRoot: string): Promise<void> => {
  const mapPath = path.join(
    workspaceRoot,
    ".codeai-hub/demo-workspace/application_skeleton/application-skeleton-map.json"
  );
  await mkdir(path.dirname(mapPath), { recursive: true });
  await writeFile(
    mapPath,
    `${JSON.stringify({
      schema: "codeai-application-skeleton-v1",
      accepted: true,
      materialized: true,
      materializationState: "materialized",
      productParts: [
        {
          id: "local-runtime",
          codePath: "src/product-parts/local-runtime",
          clusters: [
            {
              id: "orchestration",
              codePath:
                "src/product-parts/local-runtime/clusters/orchestration",
              modules: [
                {
                  id: "workflow-state",
                  codePath:
                    "src/product-parts/local-runtime/clusters/orchestration/modules/workflow-state",
                },
              ],
            },
          ],
          standaloneModules: [
            {
              id: "provider-bridge",
              codePath:
                "src/product-parts/local-runtime/modules/provider-bridge",
            },
          ],
        },
      ],
    })}\n`,
    "utf8"
  );
};

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

test("DevelopmentTreeFilesystemStructuratorFacade skips production paths until skeleton is materialized", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "devtree-facade-")
  );
  try {
    const mapPath = path.join(
      workspaceRoot,
      ".codeai-hub/demo-workspace/application_skeleton/application-skeleton-map.json"
    );
    await mkdir(path.dirname(mapPath), { recursive: true });
    await writeFile(
      mapPath,
      `${JSON.stringify({
        schema: "codeai-application-skeleton-v1",
        accepted: true,
        materialized: false,
        materializationState: "not_started",
        productParts: [
          {
            id: "local-runtime",
            codePath: "src/product-parts/local-runtime",
          },
        ],
      })}\n`,
      "utf8"
    );

    const facade = new DevelopmentTreeFilesystemStructuratorFacade();
    const result = await facade.materialize({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
      snapshot: createSnapshot(),
    });

    assert.equal(
      result.productionApply.skippedReason,
      "application_skeleton_not_materialized"
    );
    assert.equal(
      await stat(
        path.join(workspaceRoot, "src/product-parts/local-runtime")
      ).catch(() => null),
      null
    );
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

test("DevelopmentTreeFilesystemStructuratorFacade reports filesystem orphans without deleting populated content", async () => {
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
    const orphanAbsolutePath = path.join(
      plan.rootAbsolutePath,
      "product-parts",
      "removed-part"
    );
    const orphanArtifactPath = path.join(orphanAbsolutePath, "notes.md");
    await mkdir(orphanAbsolutePath, { recursive: true });
    await writeFile(orphanArtifactPath, "manual artifact", "utf8");

    const result = await facade.materialize({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
      snapshot: createSnapshot(),
    });

    assert.deepEqual(result.orphans.orphanRelativePaths, [orphanPath]);
    assert.deepEqual(result.orphans.populatedOrphanRelativePaths, [orphanPath]);
    assert.deepEqual(result.orphans.orphanDirectories, [
      {
        relativePath: orphanPath,
        contentState: "populated",
        disposition: "requires_user_disposition",
      },
    ]);
    assert.equal((await stat(orphanArtifactPath)).isFile(), true);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DevelopmentTreeFilesystemStructuratorFacade materializes accepted production code paths", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "devtree-facade-")
  );
  try {
    await writeSkeletonMap(workspaceRoot);
    const facade = new DevelopmentTreeFilesystemStructuratorFacade();
    const result = await facade.materialize({
      workspaceRoot,
      workspaceSlug: "demo-workspace",
      snapshot: createSnapshot(),
    });

    assert.deepEqual(result.productionApply.conflicts, []);
    assert.equal(
      result.productionApply.created.includes(
        "src/product-parts/local-runtime/clusters/orchestration/modules/workflow-state"
      ),
      true
    );
    assert.equal(
      (
        await stat(
          path.join(
            workspaceRoot,
            "src/product-parts/local-runtime/modules/provider-bridge"
          )
        )
      ).isDirectory(),
      true
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
