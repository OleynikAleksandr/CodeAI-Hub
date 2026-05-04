import assert from "node:assert/strict";
import { mkdir, mkdtemp, readdir, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { DevelopmentTreeSnapshot } from "../development-tree-types";
import { DevelopmentTreeFilesystemApplier } from "./development-tree-filesystem-applier";
import { DevelopmentTreeFilesystemPathPlanner } from "./development-tree-filesystem-path-planner";

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

const createPlan = (workspaceRoot: string) =>
  new DevelopmentTreeFilesystemPathPlanner().plan({
    workspaceRoot,
    workspaceSlug: "demo-workspace",
    snapshot: createSnapshot(),
  });

test("DevelopmentTreeFilesystemApplier creates missing materialized directories", async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "devtree-apply-"));
  try {
    const plan = createPlan(workspaceRoot);
    const result = await new DevelopmentTreeFilesystemApplier().apply(plan);

    assert.equal(result.conflicts.length, 0);
    assert.equal(result.existing.length, 0);
    assert.equal(result.created.length, plan.directories.length);
    for (const directory of plan.directories) {
      assert.equal((await stat(directory.absolutePath)).isDirectory(), true);
    }
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DevelopmentTreeFilesystemApplier is idempotent on existing directories", async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "devtree-apply-"));
  try {
    const plan = createPlan(workspaceRoot);
    const applier = new DevelopmentTreeFilesystemApplier();

    await applier.apply(plan);
    const result = await applier.apply(plan);

    assert.equal(result.conflicts.length, 0);
    assert.equal(result.created.length, 0);
    assert.equal(result.existing.length, plan.directories.length);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("DevelopmentTreeFilesystemApplier reports file conflicts without deleting user data", async () => {
  const workspaceRoot = await mkdtemp(path.join(os.tmpdir(), "devtree-apply-"));
  try {
    const plan = createPlan(workspaceRoot);
    const conflict = plan.directories.find(
      (directory) => directory.kind === "product_part"
    );
    assert.ok(conflict);
    await mkdir(path.dirname(conflict.absolutePath), { recursive: true });
    await writeFile(conflict.absolutePath, "manual file", "utf8");

    const result = await new DevelopmentTreeFilesystemApplier().apply(plan);

    assert.deepEqual(
      result.conflicts.map((directory) => directory.relativePath),
      [conflict.relativePath]
    );
    assert.equal(
      await readdir(path.dirname(conflict.absolutePath)).then((entries) =>
        entries.includes(path.basename(conflict.absolutePath))
      ),
      true
    );
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
