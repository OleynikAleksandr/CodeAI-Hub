import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const FACADE_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx"
);
const SHELL_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx"
);
const MODULES_PANEL_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/diagram-modules/diagram-modules-panel.tsx"
);
const FACADE_PANEL_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/diagram-facades/diagram-facades-panel.tsx"
);
const SCAFFOLD_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/diagram-editor/diagram-stage-panel-scaffold.tsx"
);

test("diagram-editor-facade keeps React Flow diagnostics widgets but no auto-layout controls", async () => {
  const source = await readFile(FACADE_SOURCE_PATH, "utf8");

  assert.equal(source.includes("<Controls showInteractive={false} />"), true);
  assert.equal(source.includes("<MiniMap"), false);
  assert.equal(source.includes("nodesDraggable={Boolean(onNodesChange)}"), true);
  assert.equal(source.includes("ReactFlowProvider"), false);
  assert.equal(source.includes("useReactFlow"), false);
  assert.equal(source.includes("useNodesInitialized"), false);
  assert.equal(source.includes("Auto-layout"), false);
  assert.equal(source.includes("layoutProfileOptions"), false);
});

test("diagram-editor-shell is now user-owned layout only", async () => {
  const source = await readFile(SHELL_SOURCE_PATH, "utf8");

  assert.equal(source.includes("applyNodeChanges"), true);
  assert.equal(source.includes("handleFlowNodesChange"), true);
  assert.equal(source.includes("void onNodesChange?.(nextNodesSnapshot);"), true);
  assert.equal(source.includes("SaveStatusIndicator"), false);
  assert.equal(source.includes("viewportRefreshToken"), false);
  assert.equal(source.includes("onFlowStateChange"), false);
  assert.equal(source.includes("initialLayoutProfile"), false);
  assert.equal(source.includes("Auto-layout"), false);
});

test("diagram stage scaffold keeps the visual shell stretched to full panel height", async () => {
  const source = await readFile(SCAFFOLD_SOURCE_PATH, "utf8");

  assert.equal(source.includes("minHeight: \"100%\""), true);
  assert.equal(source.includes("gridTemplateRows: \"auto minmax(0, 1fr)\""), true);
  assert.equal(source.includes("flex: \"1 1 auto\""), true);
});

test("diagram modules panel persists manual node positions without layout profiles", async () => {
  const source = await readFile(MODULES_PANEL_SOURCE_PATH, "utf8");

  assert.equal(source.includes("onNodesChange={async (nodes) => {"), true);
  assert.equal(
    source.includes("await persistNodes({ nodes, revision: visualProjection.revision });"),
    true
  );
  assert.equal(source.includes("Edit modules"), false);
  assert.equal(source.includes("Edit relations"), false);
  assert.equal(source.includes("useDomainPatch"), false);
  assert.equal(source.includes("ModuleEntityEditor"), false);
  assert.equal(source.includes("ModuleRelationEditor"), false);
});

test("diagram facades panel is visual-only and keeps semantic edits out of the surface", async () => {
  const source = await readFile(FACADE_PANEL_SOURCE_PATH, "utf8");

  assert.equal(source.includes("onNodesChange={async (nodes) => {"), true);
  assert.equal(
    source.includes("await persistNodes({ nodes, revision: visualProjection.revision });"),
    true
  );
  assert.equal(source.includes("Edit facades"), false);
  assert.equal(source.includes("Edit methods and ports"), false);
  assert.equal(source.includes("Edit relations"), false);
  assert.equal(source.includes("useDomainPatch"), false);
  assert.equal(source.includes("FacadeEntityEditor"), false);
  assert.equal(source.includes("FacadeMethodsEditor"), false);
  assert.equal(source.includes("FacadePortsEditor"), false);
  assert.equal(source.includes("FacadeRelationEditor"), false);
});
