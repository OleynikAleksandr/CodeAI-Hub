import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { ClusterContractPlanWriter } from "./cluster-contract-plan-writer";

const SPEC_PATTERN = /ClusterSpecification\.draft\.md/u;
const FACADE_PATTERN = /ClusterFacadeContract\.draft\.md/u;
const CURRENT_TASK_PATTERN =
  /"currentTaskId": "development-tree\.cluster-contract\.finder-widget\.note-selection-cluster\.phase1\.contract-draft\.task1"/u;
const REVIEW_TASK_PATTERN =
  /phase2\.contract-review\.task1` User or lead Product Part reviews/u;
const MERGE_READY_PATTERN = /phase3\.merge-ready\.task1/u;

test("ClusterContractPlanWriter creates an idempotent cluster contract plan", async () => {
  const worktreeRoot = await mkdtemp(
    path.join(os.tmpdir(), "cluster-contract-plan-")
  );
  try {
    const writer = new ClusterContractPlanWriter();
    const request = {
      branchName:
        "codex/development-tree/demo/product-parts/finder-widget/clusters/note-selection-cluster/contract",
      clusterId: "note-selection-cluster",
      partId: "finder-widget",
      worktreeRoot,
      workspaceSlug: "demo",
    };

    const first = await writer.writePlan(request);
    const second = await writer.writePlan(request);

    assert.equal(first.action, "created");
    assert.equal(second.action, "unchanged");
    assert.equal(
      first.relativePath,
      "doc/TODO/stages/development-tree/product-parts/finder-widget/clusters/note-selection-cluster/todo-plan.md"
    );
    const content = await readFile(first.absolutePath, "utf8");
    assert.match(content, SPEC_PATTERN);
    assert.match(content, FACADE_PATTERN);
    assert.match(content, CURRENT_TASK_PATTERN);
    assert.match(content, REVIEW_TASK_PATTERN);
    assert.match(content, MERGE_READY_PATTERN);
  } finally {
    await rm(worktreeRoot, { force: true, recursive: true });
  }
});
