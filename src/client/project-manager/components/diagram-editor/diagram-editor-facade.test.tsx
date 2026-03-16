import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { applyDiagramAutoLayout } from "./diagram-layout-facade";

const FACADE_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/diagram-editor/diagram-editor-facade.tsx"
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

test("diagram-editor-facade keeps React Flow provider and diagnostics widgets encapsulated", async () => {
  const source = await readFile(FACADE_SOURCE_PATH, "utf8");

  assert.equal(source.includes("ReactFlowProvider"), true);
  assert.equal(source.includes("<Controls showInteractive={false} />"), true);
  assert.equal(source.includes("<MiniMap pannable zoomable />"), true);
  assert.equal(source.includes("Auto-layout"), true);
});
