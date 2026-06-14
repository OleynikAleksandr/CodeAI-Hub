import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import type { DevelopmentTreeDetectedNode } from "../node-bootstrap/development-tree-node-detector";
import { ProductPartDevelopmentBriefPlanWriter } from "./product-part-development-brief-plan-writer";

const PLAN_TITLE_PATTERN = /Product Part Development Brief Managed TODO Plan/;
const PLAN_ID_PATTERN = /"planId": "development-tree-product-part-engine"/;
const CURRENT_BRIEF_TASK_PATTERN =
  /"currentTaskId": "development-tree\.product-part\.engine\.phase1\.brief\.task1"/;
const BRIEF_DRAFT_FILE_PATTERN = /ProductPartDevelopmentBrief\.draft\.md/;
const ORDER_PLAN_FILE_PATTERN = /DevelopmentOrderPlan\.draft\.md/;
const ORDER_PLAN_JSON_FILE_PATTERN = /DevelopmentOrderPlan\.draft\.json/;
const LEADERSHIP_ORDER_PATTERN =
  /Product Part leadership order: engine, web-surface/;
const NO_DOWNSTREAM_COORDINATION_PATTERN = /downstream-coordination/u;
const RETURN_PHASE_AFTER_ORDER_PLAN_PATTERN =
  /9\. \[TODO\] `development-tree\.product-part\.engine\.phase-return\.user-return\.task1`/u;

const createProductPartNode = (
  workspaceRoot: string,
  partId: string
): DevelopmentTreeDetectedNode => ({
  absolutePath: path.join(
    workspaceRoot,
    ".codeai-hub/demo/development_tree/materialized/product-parts",
    partId
  ),
  id: partId,
  kind: "product_part",
  partId,
  relativePath: `.codeai-hub/demo/development_tree/materialized/product-parts/${partId}`,
});

test("ProductPartDevelopmentBriefPlanWriter creates an idempotent lead Product Part plan", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "product-part-brief-plan-")
  );
  try {
    const writer = new ProductPartDevelopmentBriefPlanWriter();
    const node = createProductPartNode(workspaceRoot, "engine");

    const first = await writer.writePlan({
      leadProductPartId: "engine",
      node,
      productPartLeadershipOrder: ["engine", "web-surface"],
      workspaceRoot,
      workspaceSlug: "demo",
    });
    const second = await writer.writePlan({
      leadProductPartId: "engine",
      node,
      productPartLeadershipOrder: ["engine", "web-surface"],
      workspaceRoot,
      workspaceSlug: "demo",
    });

    assert.ok(first);
    assert.equal(first.action, "created");
    assert.equal(first.isLeadPart, true);
    assert.equal(
      first.relativePath,
      "doc/TODO/stages/development-tree/product-parts/engine/todo-plan.md"
    );
    assert.ok(second);
    assert.equal(second.action, "unchanged");

    const content = await readFile(first.absolutePath, "utf8");
    assert.match(content, PLAN_TITLE_PATTERN);
    assert.match(content, PLAN_ID_PATTERN);
    assert.match(content, CURRENT_BRIEF_TASK_PATTERN);
    assert.match(content, BRIEF_DRAFT_FILE_PATTERN);
    assert.match(content, ORDER_PLAN_FILE_PATTERN);
    assert.match(content, ORDER_PLAN_JSON_FILE_PATTERN);
    assert.match(content, LEADERSHIP_ORDER_PATTERN);
    assert.doesNotMatch(content, NO_DOWNSTREAM_COORDINATION_PATTERN);
    assert.match(content, RETURN_PHASE_AFTER_ORDER_PLAN_PATTERN);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});

test("ProductPartDevelopmentBriefPlanWriter skips non Product Part nodes", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(os.tmpdir(), "product-part-brief-plan-")
  );
  try {
    const writer = new ProductPartDevelopmentBriefPlanWriter();
    const result = await writer.writePlan({
      node: {
        ...createProductPartNode(workspaceRoot, "engine"),
        id: "time-info",
        kind: "cluster",
      },
      workspaceRoot,
      workspaceSlug: "demo",
    });

    assert.equal(result, null);
  } finally {
    await rm(workspaceRoot, { recursive: true, force: true });
  }
});
