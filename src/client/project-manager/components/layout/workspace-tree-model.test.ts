import assert from "node:assert/strict";
import test from "node:test";
import { resolveTreeStatus } from "./workspace-tree-model";

test("resolveTreeStatus marks provider-direct stages active once a draft artifact exists", () => {
  assert.equal(
    resolveTreeStatus("in_progress", false, {
      hasArtifact: true,
      stage: "description",
    }),
    "active"
  );
  assert.equal(
    resolveTreeStatus("in_progress", false, {
      hasArtifact: true,
      stage: "virtual_simulation",
    }),
    "active"
  );
});

test("resolveTreeStatus keeps Diagram Modules orange until Core opens user review", () => {
  assert.equal(
    resolveTreeStatus("in_progress", false, {
      hasArtifact: true,
      reviewReady: false,
      stage: "diagram_modules",
    }),
    "progress"
  );
});

test("resolveTreeStatus marks Diagram Modules active after aggregate review opens", () => {
  assert.equal(
    resolveTreeStatus("in_progress", false, {
      hasArtifact: true,
      reviewReady: true,
      stage: "diagram_modules",
    }),
    "active"
  );
});

test("resolveTreeStatus marks completed artifact stages active", () => {
  assert.equal(resolveTreeStatus("completed", false, true), "active");
});
