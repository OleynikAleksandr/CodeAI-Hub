import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  normalizeArtifactHeaderMode,
  resolveArtifactHeaderModes,
  resolveDiagramSourceArtifact,
  resolveDiagramSourcePendingMessage,
} from "./stage-artifact-mode";

const MODULES_PANEL_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx"
);

test("diagram stages expose correct header modes", () => {
  assert.deepEqual(resolveArtifactHeaderModes("Diagram Modules"), [
    "artifacts",
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
      label: "product-parts.index.md",
      path: ".codeai-hub/workspace-slug/diagram_modules/product-parts.index.md",
      workspacePath: "/tmp/workspace",
      workspaceSlug: "workspace-slug",
    }
  );
});

test("diagram source pending message follows the real upstream workflow", () => {
  assert.equal(
    resolveDiagramSourcePendingMessage("Diagram Modules").includes(
      "`product-parts.index.md`"
    ),
    true
  );
});

test("diagram modules panel points users to the staged index-first contract", async () => {
  const source = await readFile(MODULES_PANEL_SOURCE_PATH, "utf8");

  assert.equal(source.includes('artifactFileName="product-parts.index.md"'), true);
  assert.equal(source.includes("diagram_modules/product-parts.index.md"), true);
  assert.equal(source.includes("staged Diagram Modules structure"), true);
  assert.equal(source.includes("derived visual module map"), false);
});
