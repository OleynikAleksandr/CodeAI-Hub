import assert from "node:assert/strict";
import test from "node:test";
import { createManagedWorkspaceSemanticDriftReport } from "./managed-workspace-drift";

test("createManagedWorkspaceSemanticDriftReport marks semantic drift as decision-required blocker", () => {
  const report = createManagedWorkspaceSemanticDriftReport([
    {
      affectedPaths: [
        ".codeai-hub/demo/application_skeleton/application-skeleton-map.json",
        ".codeai-hub/demo/diagram_modules/product-parts.index.md",
      ],
      code: "application_skeleton_outdated",
      detail: "Diagram Modules changed after skeleton materialization.",
      recommendedOwner: "agent",
    },
  ]);

  assert.equal(report.ok, false);
  assert.equal(report.schema, "codeai-managed-workspace-semantic-drift-v1");
  assert.equal(report.issues[0]?.blocking, true);
  assert.equal(report.issues[0]?.repairMode, "decision_required");
});

test("createManagedWorkspaceSemanticDriftReport returns ok for empty semantic drift", () => {
  const report = createManagedWorkspaceSemanticDriftReport([]);

  assert.equal(report.ok, true);
  assert.deepEqual(report.issues, []);
});
