import assert from "node:assert/strict";
import test from "node:test";
import type { DiagramRevisionDiff } from "./diagram-revision-diff";
import { planDownstreamWorkflowMigrations } from "./downstream-migration-planner";

const SKELETON_MAP_RE = /application-skeleton-map\.json/u;
const FACADE_GATES_RE = /facade gates/u;

test("planDownstreamWorkflowMigrations creates skeleton and gate tasks without mutating files", () => {
  const diff: DiagramRevisionDiff = {
    baselineRevision: "base",
    currentRevision: "current",
    changes: [
      {
        action: "added",
        changedFields: [],
        id: "audit-log",
        kind: "module",
        parentId: "shell",
        summary: "Module added: audit-log",
        title: "Audit Log",
      },
      {
        action: "renamed",
        changedFields: ["id"],
        fromId: "module:legacy-export:facade",
        id: "module:legacy-report-export:facade",
        kind: "facade_boundary",
        parentId: "legacy-report-export",
        summary:
          "Facade Boundary renamed: module:legacy-export:facade -> module:legacy-report-export:facade",
        title: "Legacy Report Export Facade",
      },
      {
        action: "removed",
        changedFields: [],
        id: "old-cluster",
        kind: "cluster",
        parentId: "shell",
        summary: "Cluster removed: old-cluster",
        title: "Old Cluster",
      },
    ],
  };

  const plan = planDownstreamWorkflowMigrations(diff);

  assert.equal(plan.schema, "codeai-downstream-migration-plan-v1");
  assert.equal(plan.baselineRevision, "base");
  assert.equal(plan.currentRevision, "current");
  assert.deepEqual(
    plan.tasks.map((task) => [task.stage, task.priority, task.changeId]),
    [
      ["application_skeleton", "medium", "module:added:audit-log:audit-log"],
      ["quality_gates", "medium", "module:added:audit-log:audit-log"],
      [
        "quality_gates",
        "high",
        "facade_boundary:renamed:module:legacy-export:facade:module:legacy-report-export:facade",
      ],
      [
        "application_skeleton",
        "high",
        "cluster:removed:old-cluster:old-cluster",
      ],
      ["quality_gates", "medium", "cluster:removed:old-cluster:old-cluster"],
    ]
  );
  assert.match(plan.tasks[0]?.task ?? "", SKELETON_MAP_RE);
  assert.match(plan.tasks[2]?.task ?? "", FACADE_GATES_RE);
});
