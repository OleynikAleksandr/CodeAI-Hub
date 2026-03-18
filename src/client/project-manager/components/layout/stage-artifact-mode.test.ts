import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeArtifactHeaderMode,
  resolveArtifactHeaderModes,
  resolveDiagramSourceArtifact,
} from "./stage-artifact-mode";

test("diagram stages expose source mode in the artifact header", () => {
  assert.deepEqual(resolveArtifactHeaderModes("Diagram Modules"), [
    "artifacts",
    "source",
    "help",
  ]);
  assert.deepEqual(resolveArtifactHeaderModes("Diagram Facades"), [
    "artifacts",
    "source",
    "help",
  ]);
});

test("non-diagram stages keep the legacy artifact/help contract", () => {
  assert.deepEqual(resolveArtifactHeaderModes("Description"), [
    "artifacts",
    "help",
  ]);
  assert.deepEqual(resolveArtifactHeaderModes("VIRTUAL SIMULATION"), [
    "artifacts",
    "help",
  ]);
});

test("source mode normalizes back to artifacts when the stage does not support it", () => {
  assert.equal(normalizeArtifactHeaderMode("Description", "source"), "artifacts");
  assert.equal(normalizeArtifactHeaderMode(null, "help"), "artifacts");
});

test("diagram source artifact resolves to the canonical markdown path", () => {
  assert.deepEqual(
    resolveDiagramSourceArtifact({
      activeTool: "Diagram Modules",
      workspacePath: "/tmp/workspace",
      workspaceSlug: "workspace-slug",
    }),
    {
      label: "module-map.md",
      path: ".codeai-hub/workspace-slug/diagram_modules/module-map.md",
      workspacePath: "/tmp/workspace",
      workspaceSlug: "workspace-slug",
    }
  );
});
