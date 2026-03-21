import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const FACADE_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx"
);
const MODULES_PANEL_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx"
);

test("diagram modules renderer differentiates product part and cluster containers", async () => {
  const source = await readFile(FACADE_SOURCE_PATH, "utf8");

  assert.equal(source.includes('data.nodeKind === "productPart"'), true);
  assert.equal(source.includes("Product Part"), true);
  assert.equal(source.includes("Role: {data.role}"), true);
  assert.equal(source.includes("Modules: {data.moduleIds.length}"), true);
  assert.equal(source.includes("Standalone in {data.productPart}"), true);
  assert.equal(source.includes("width: \"100%\""), true);
  assert.equal(source.includes("height: \"100%\""), true);
});

test("diagram modules panel explains ownership hierarchy in the pending state", async () => {
  const source = await readFile(MODULES_PANEL_SOURCE_PATH, "utf8");

  assert.equal(source.includes("самостоятельные части продукта"), true);
  assert.equal(source.includes("Product Part -&gt; Cluster -&gt; Module"), true);
});
