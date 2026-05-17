import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const FACADE_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx"
);
const MODULES_HELP_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/diagram-modules/diagram-modules-help.tsx"
);

test("diagram modules renderer differentiates product part and cluster containers", async () => {
  const source = await readFile(FACADE_SOURCE_PATH, "utf8");

  assert.equal(source.includes("Product Part"), true);
  assert.equal(source.includes("Clusters: {data.clusters.length}"), true);
  assert.equal(source.includes("Standalone Modules:"), true);
  assert.equal(source.includes("Purpose"), true);
  assert.equal(source.includes("data.purpose"), true);
  assert.equal(
    source.includes('gridTemplateColumns: "auto minmax(240px, 1fr)"'),
    true
  );
  assert.equal(source.includes("Modules: {data.modules.length}"), true);
  assert.equal(source.includes("width: \"fit-content\""), true);
  assert.equal(source.includes("justifySelf: \"start\""), true);
});

test("diagram modules renderer keeps cluster/module grids compact", async () => {
  const source = await readFile(FACADE_SOURCE_PATH, "utf8");

  assert.equal(source.includes("const MODULE_CARD_MIN_WIDTH = 220;"), true);
  assert.equal(source.includes("const MODULE_CARD_MAX_WIDTH = 260;"), true);
  assert.equal(source.includes("const MODULE_GRID_GAP = 10;"), true);
  assert.equal(
    source.includes(
      "gridTemplateColumns: `repeat(${moduleCols}, minmax(${MODULE_CARD_MIN_WIDTH}px, ${MODULE_CARD_MAX_WIDTH}px))`"
    ),
    true
  );
  assert.equal(
    source.includes("gridTemplateColumns: `repeat(${columns}, max-content)`"),
    true
  );
  assert.equal(source.includes("const AUTO_FIT_MIN = 0.12;"), true);
});

test("diagram modules panel explains ownership hierarchy in the pending state", async () => {
  const source = await readFile(MODULES_HELP_SOURCE_PATH, "utf8");

  assert.equal(source.includes("Product Part"), true);
  assert.equal(source.includes("Product Part -> Cluster -> Module"), true);
});
