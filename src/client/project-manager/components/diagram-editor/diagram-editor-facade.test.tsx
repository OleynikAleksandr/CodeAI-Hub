import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { applyDiagramAutoLayout } from "./diagram-layout-facade";

const FACADE_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx"
);
const SHELL_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/diagram-editor/diagram-editor-shell.tsx"
);
const SCAFFOLD_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/diagram-editor/diagram-stage-panel-scaffold.tsx"
);

test("applyDiagramAutoLayout returns positioned nodes for a simple graph", async () => {
  const nodes = [
    {
      id: "module-a",
      type: "module" as const,
      position: { x: 0, y: 0 },
      data: {
        stage: "diagram_modules" as const,
        nodeKind: "module" as const,
        moduleId: "module-a",
        title: "Module A",
        kind: "service" as const,
        responsibility: "Source node",
        status: "proposed" as const,
        origin: "agent" as const,
        cluster: undefined,
        inputCount: 0,
        outputCount: 1,
      },
    },
    {
      id: "module-b",
      type: "module" as const,
      position: { x: 0, y: 0 },
      data: {
        stage: "diagram_modules" as const,
        nodeKind: "module" as const,
        moduleId: "module-b",
        title: "Module B",
        kind: "service" as const,
        responsibility: "Target node",
        status: "accepted" as const,
        origin: "user" as const,
        cluster: undefined,
        inputCount: 1,
        outputCount: 0,
      },
    },
  ];
  const edges = [
    {
      id: "module-a__sync-call__module-b",
      type: "relation" as const,
      source: "module-a",
      target: "module-b",
      data: {
        stage: "diagram_modules" as const,
        edgeKind: "relation" as const,
        relationId: "module-a__sync-call__module-b",
        relationType: "sync-call" as const,
        criticality: "medium" as const,
        label: "execute()",
        origin: "agent" as const,
        status: "proposed" as const,
      },
    },
  ];

  const layout = await applyDiagramAutoLayout({ nodes, edges });

  assert.equal(layout.length, 2);
  assert.equal(layout[0].position.x >= 0, true);
  assert.equal(layout[0].position.y >= 0, true);
  assert.notDeepEqual(layout.map((node) => node.position), [
    { x: 0, y: 0 },
    { x: 0, y: 0 },
  ]);
});

test("applyDiagramAutoLayout supports distinct vertical and horizontal profiles", async () => {
  const nodes = [
    {
      id: "module-a",
      type: "module" as const,
      position: { x: 0, y: 0 },
      data: {
        stage: "diagram_modules" as const,
        nodeKind: "module" as const,
        moduleId: "module-a",
        title: "Module A",
        kind: "service" as const,
        responsibility: "A",
        status: "proposed" as const,
        origin: "agent" as const,
        cluster: undefined,
        inputCount: 0,
        outputCount: 1,
      },
    },
    {
      id: "module-b",
      type: "module" as const,
      position: { x: 0, y: 0 },
      data: {
        stage: "diagram_modules" as const,
        nodeKind: "module" as const,
        moduleId: "module-b",
        title: "Module B",
        kind: "service" as const,
        responsibility: "B",
        status: "accepted" as const,
        origin: "user" as const,
        cluster: undefined,
        inputCount: 1,
        outputCount: 1,
      },
    },
    {
      id: "module-c",
      type: "module" as const,
      position: { x: 0, y: 0 },
      data: {
        stage: "diagram_modules" as const,
        nodeKind: "module" as const,
        moduleId: "module-c",
        title: "Module C",
        kind: "service" as const,
        responsibility: "C",
        status: "accepted" as const,
        origin: "user" as const,
        cluster: undefined,
        inputCount: 1,
        outputCount: 0,
      },
    },
  ];
  const edges = [
    {
      id: "a-b",
      type: "relation" as const,
      source: "module-a",
      target: "module-b",
      data: {
        stage: "diagram_modules" as const,
        edgeKind: "relation" as const,
        relationId: "a-b",
        relationType: "sync-call" as const,
        criticality: "medium" as const,
        label: "a",
        origin: "agent" as const,
        status: "proposed" as const,
      },
    },
    {
      id: "b-c",
      type: "relation" as const,
      source: "module-b",
      target: "module-c",
      data: {
        stage: "diagram_modules" as const,
        edgeKind: "relation" as const,
        relationId: "b-c",
        relationType: "sync-call" as const,
        criticality: "medium" as const,
        label: "b",
        origin: "agent" as const,
        status: "proposed" as const,
      },
    },
  ];

  const vertical = await applyDiagramAutoLayout({
    nodes,
    edges,
    profile: "vertical",
  });
  const horizontal = await applyDiagramAutoLayout({
    nodes,
    edges,
    profile: "horizontal",
  });

  const verticalSpanX =
    Math.max(...vertical.map((node) => node.position.x)) -
    Math.min(...vertical.map((node) => node.position.x));
  const verticalSpanY =
    Math.max(...vertical.map((node) => node.position.y)) -
    Math.min(...vertical.map((node) => node.position.y));
  const horizontalSpanX =
    Math.max(...horizontal.map((node) => node.position.x)) -
    Math.min(...horizontal.map((node) => node.position.x));
  const horizontalSpanY =
    Math.max(...horizontal.map((node) => node.position.y)) -
    Math.min(...horizontal.map((node) => node.position.y));

  assert.equal(verticalSpanY > verticalSpanX, true);
  assert.equal(horizontalSpanX > horizontalSpanY, true);
});

test("diagram-editor-facade keeps React Flow provider and diagnostics widgets encapsulated", async () => {
  const source = await readFile(FACADE_SOURCE_PATH, "utf8");

  assert.equal(source.includes("ReactFlowProvider"), true);
  assert.equal(source.includes("useReactFlow"), true);
  assert.equal(source.includes("useNodesInitialized"), true);
  assert.equal(source.includes("fitView(FIT_VIEW_OPTIONS)"), true);
  assert.equal(source.includes("<Controls showInteractive={false} />"), true);
  assert.equal(source.includes("<MiniMap pannable zoomable style={miniMapStyle} />"), true);
  assert.equal(source.includes("nodesDraggable={Boolean(onNodesChange)}"), true);
  assert.equal(source.includes("Diagram layout profile"), true);
  assert.equal(source.includes("layoutProfileOptions.map"), true);
  assert.equal(source.includes("Auto-layout"), true);
});

test("diagram-editor-shell requests viewport refresh after auto-layout", async () => {
  const source = await readFile(SHELL_SOURCE_PATH, "utf8");

  assert.equal(source.includes("setViewportRefreshToken"), true);
  assert.equal(source.includes("requestViewportRefresh();"), true);
  assert.equal(source.includes("projection.stage === \"diagram_modules\""), true);
  assert.equal(source.includes("viewportRefreshToken={viewportRefreshToken}"), true);
});

test("diagram stage scaffold keeps the visual shell stretched to full panel height", async () => {
  const source = await readFile(SCAFFOLD_SOURCE_PATH, "utf8");

  assert.equal(source.includes("minHeight: \"100%\""), true);
  assert.equal(source.includes("gridTemplateRows: \"auto minmax(0, 1fr)\""), true);
  assert.equal(source.includes("flex: \"1 1 auto\""), true);
});
