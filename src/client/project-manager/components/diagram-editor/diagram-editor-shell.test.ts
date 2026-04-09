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

test("diagram editor shell persists context-menu layout param edits via onNodesChange", async () => {
  const source = await readFile(SHELL_SOURCE_PATH, "utf8");

  // All three right-click layout param handlers must push the updated
  // nodes through onNodesChange so Sidecar v2 can store them. If these
  // vanish, user edits silently stop surviving reload again.
  const onNodesChangeCalls = source.match(/onNodesChange\?\.\(next\)/g) ?? [];
  assert.equal(
    onNodesChangeCalls.length >= 3,
    true,
    `expected at least 3 onNodesChange?.(next) call sites, found ${onNodesChangeCalls.length}`
  );

  assert.equal(source.includes("handleProductPartColumnsChange"), true);
  assert.equal(source.includes("handleProductPartAspectRatioChange"), true);
  assert.equal(source.includes("handleClusterModuleColumnsChange"), true);

  // projection-reset useEffect must still prefer initialNodes over
  // projection.nodes; otherwise the sidecar-applied layoutParams get
  // overwritten by raw adapter defaults on every projection rebuild.
  assert.equal(
    source.includes("setNodes(initialNodes ?? projection.nodes)"),
    true
  );
});
