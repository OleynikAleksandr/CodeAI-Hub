import assert from "node:assert/strict";
import test from "node:test";
import type { DiagramFlowNode } from "./adapters/domain-model-to-react-flow.types";
import { normalizeManualDiagramLayout } from "./diagram-editor-manual-layout-normalizer";

const createClusterNode = (): DiagramFlowNode => ({
  id: "cluster:workspace-fs",
  type: "cluster",
  position: { x: 24, y: 102 },
  parentId: "product-part:core-runtime",
  width: 288,
  height: 260,
  measured: { width: 288, height: 260, bodyStartY: 136 },
  style: { width: 288, height: 260 },
  data: {
    stage: "diagram_modules",
    nodeKind: "cluster",
    clusterId: "workspace-fs",
    productPartId: "core-runtime",
    title: "Workspace Fs",
    purpose: "Owns files.",
    moduleIds: ["markdown-parser", "fs-sync"],
    containerConstraints: {
      childMinX: 24,
      childMinY: 102,
      minWidth: 288,
      minHeight: 128,
      paddingRight: 24,
      paddingBottom: 12,
    },
  },
});

const createModuleNode = (params: {
  readonly id: string;
  readonly y: number;
  readonly height: number;
  readonly parentId: string;
}): DiagramFlowNode => ({
  id: params.id,
  type: "module",
  position: { x: 24, y: params.y },
  parentId: params.parentId,
  width: 240,
  height: params.height,
  measured: { width: 240, height: params.height },
  style: { width: 240, minHeight: params.height - 30 },
  data: {
    stage: "diagram_modules",
    nodeKind: "module",
    moduleId: params.id,
    title: params.id,
    kind: "service",
    responsibility: "Manual drag regression fixture.",
    status: "proposed",
    origin: "agent",
    productPart: "core-runtime",
    cluster: params.parentId === "cluster:workspace-fs" ? "workspace-fs" : undefined,
    inputCount: 0,
    outputCount: 0,
  },
});

const createProductPartNode = (): DiagramFlowNode => ({
  id: "product-part:core-runtime",
  type: "cluster",
  position: { x: 0, y: 0 },
  width: 720,
  height: 260,
  measured: { width: 720, height: 260, bodyStartY: 140 },
  style: { width: 720, height: 260 },
  data: {
    stage: "diagram_modules",
    nodeKind: "productPart",
    productPartId: "core-runtime",
    title: "Core Runtime",
    purpose: "Owns runtime.",
    clusterIds: ["workspace-fs"],
    standaloneModuleIds: ["provider-facade"],
    containerConstraints: {
      childMinX: 24,
      childMinY: 110,
      minWidth: 720,
      minHeight: 260,
      paddingRight: 24,
      paddingBottom: 12,
    },
  },
});

test("normalizeManualDiagramLayout clamps modules to the measured container body start", () => {
  const result = normalizeManualDiagramLayout(
    [
      createProductPartNode(),
      createClusterNode(),
      createModuleNode({
        id: "markdown-parser",
        y: 120,
        height: 139,
        parentId: "cluster:workspace-fs",
      }),
      createModuleNode({
        id: "fs-sync",
        y: 100,
        height: 156,
        parentId: "cluster:workspace-fs",
      }),
    ],
    new Set(["fs-sync"])
  );

  const fsSync = result.find((node) => node.id === "fs-sync");
  const cluster = result.find((node) => node.id === "cluster:workspace-fs");

  assert.notEqual(fsSync, undefined);
  assert.notEqual(cluster, undefined);
  if (!fsSync || !cluster) {
    return;
  }

  assert.equal(fsSync.position.y, 309);
  assert.equal(Number(cluster.style?.height), 499);
});

test("normalizeManualDiagramLayout resizes product parts from direct child visual bottoms", () => {
  const result = normalizeManualDiagramLayout(
    [
      createProductPartNode(),
      {
        ...createClusterNode(),
        style: { width: 288, height: 455 },
      },
      createModuleNode({
        id: "provider-facade",
        y: 478,
        height: 156,
        parentId: "product-part:core-runtime",
      }),
    ],
    new Set(["provider-facade"])
  );

  const productPart = result.find((node) => node.id === "product-part:core-runtime");
  const providerFacade = result.find((node) => node.id === "provider-facade");
  assert.notEqual(productPart, undefined);
  assert.notEqual(providerFacade, undefined);
  if (!productPart || !providerFacade) {
    return;
  }

  assert.equal(providerFacade.position.y, 607);
  assert.equal(Number(productPart.style?.height), 797);
});
