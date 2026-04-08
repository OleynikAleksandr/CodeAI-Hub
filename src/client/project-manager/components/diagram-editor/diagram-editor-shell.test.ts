import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SHELL_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx"
);

test("diagram editor shell explains the staged Diagram Modules empty state", async () => {
  const source = await readFile(SHELL_SOURCE_PATH, "utf8");

  assert.equal(
    source.includes("After `product-parts.index.md` is parsed"),
    true
  );
  assert.equal(
    source.includes("runtime materializes each `product-parts/<part-id>.md`"),
    true
  );
  assert.equal(source.includes("Add semantic entities"), false);
});

test("diagram editor shell has no React Flow dependency and no legacy layout normalizers", async () => {
  const source = await readFile(SHELL_SOURCE_PATH, "utf8");

  assert.equal(source.includes("@xyflow/react"), false);
  assert.equal(source.includes("applyNodeChanges"), false);
  assert.equal(source.includes("normalizeManualDiagramLayout"), false);
  assert.equal(source.includes("normalizeMeasuredDiagramLayout"), false);
  assert.equal(source.includes("handleMeasuredNodes"), false);
  assert.equal(source.includes("seed-autolayout"), false);
});
