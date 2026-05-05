import assert from "node:assert/strict";
import test from "node:test";
import { formatWorkflowStageLabel } from "./session-tabs";

test("formatWorkflowStageLabel shortens development-tree node paths to the node name", () => {
  assert.equal(
    formatWorkflowStageLabel(
      "development_tree/materialized/product-parts/project-manager/modules/desktop-launcher-claude"
    ),
    "Desktop Launcher Claude"
  );
  assert.equal(
    formatWorkflowStageLabel(
      "development_tree/materialized/product-parts/project-manager/clusters/workflow-artifact-handling/modules/artifact-workspace"
    ),
    "Artifact Workspace"
  );
});

test("formatWorkflowStageLabel keeps workflow stage labels readable", () => {
  assert.equal(formatWorkflowStageLabel("diagram_modules"), "Diagram Modules");
  assert.equal(
    formatWorkflowStageLabel("virtual_simulation"),
    "Virtual Simulation"
  );
});
