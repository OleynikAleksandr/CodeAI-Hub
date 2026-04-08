import assert from "node:assert/strict";
import test from "node:test";
import type { ContainerConstraints, DiagramFlowNode } from "./adapters/domain-model-to-react-flow.types";
import {
  MEASURED_LAYOUT_MIN_SAFE_GAP,
  normalizeMeasuredDiagramLayout,
} from "./diagram-editor-measured-layout-normalizer";

const PRODUCT_PART_CONSTRAINTS: ContainerConstraints = {
  childMinX: 24,
  childMinY: 110,
  minWidth: 720,
  minHeight: 260,
  paddingRight: 24,
  paddingBottom: 12,
};

const CLUSTER_CONSTRAINTS: ContainerConstraints = {
  childMinX: 24,
  childMinY: 86,
  minWidth: 288,
  minHeight: 128,
  paddingRight: 24,
  paddingBottom: 12,
};

const createProductPartNode = (params: {
  readonly id: string;
  readonly y: number;
  readonly height: number;
}): DiagramFlowNode => ({
  id: params.id,
  type: "cluster",
  position: { x: 0, y: params.y },
  width: 720,
  height: params.height,
  measured: { width: 720, height: params.height, bodyStartY: 140 },
  style: { width: 720, height: params.height },
  data: {
    stage: "diagram_modules",
    nodeKind: "productPart",
    productPartId: params.id.replace("product-part:", ""),
    title: "Project Manager UI",
    purpose: "Hosts the user-facing workflow surface.",
    clusterIds: ["workflow-control"],
    standaloneModuleIds: ["core-client"],
    containerConstraints: PRODUCT_PART_CONSTRAINTS,
  },
});

const createClusterNode = (): DiagramFlowNode => ({
  id: "cluster:workflow-control",
  type: "cluster",
  position: { x: 24, y: 110 },
  parentId: "product-part:project-manager-ui",
  width: 288,
  height: 260,
  measured: { width: 288, height: 260, bodyStartY: 110 },
  style: { width: 288, height: 260 },
  data: {
    stage: "diagram_modules",
    nodeKind: "cluster",
    clusterId: "workflow-control",
    productPartId: "project-manager-ui",
    title: "Workflow Control",
    purpose: "Coordinates workflow transitions.",
    moduleIds: ["step-navigator", "action-panel"],
    containerConstraints: CLUSTER_CONSTRAINTS,
  },
});

const createWideClusterNode = (): DiagramFlowNode => ({
  id: "cluster:workspace-fs",
  type: "cluster",
  position: { x: 24, y: 110 },
  parentId: "product-part:project-manager-ui",
  width: 608,
  height: 260,
  measured: { width: 608, height: 260, bodyStartY: 110 },
  style: { width: 608, height: 260 },
  data: {
    stage: "diagram_modules",
    nodeKind: "cluster",
    clusterId: "workspace-fs",
    productPartId: "project-manager-ui",
    title: "Workspace Fs",
    purpose: "Owns a wide footprint inside the product part.",
    moduleIds: ["markdown-parser", "fs-sync"],
    containerConstraints: CLUSTER_CONSTRAINTS,
  },
});

const createModuleNode = (params: {
  readonly id: string;
  readonly x?: number;
  readonly y: number;
  readonly height: number;
  readonly parentId: string;
}): DiagramFlowNode => ({
  id: params.id,
  type: "module",
  position: { x: params.x ?? 24, y: params.y },
  parentId: params.parentId,
  width: 240,
  height: params.height,
  measured: { width: 240, height: params.height },
  style: { width: 240, minHeight: params.height - 40 },
  data: {
    stage: "diagram_modules",
    nodeKind: "module",
    moduleId: params.id,
    title: params.id,
    kind: "service",
    responsibility: "Reads dense localized content and produces a taller measured box.",
    status: "proposed",
    origin: "agent",
    productPart: "project-manager-ui",
    cluster: params.parentId === "cluster:workflow-control" ? "workflow-control" : undefined,
    inputCount: 0,
    outputCount: 0,
  },
});

test("normalizeMeasuredDiagramLayout rebuilds cluster and product-part layout from measured body starts and child heights", () => {
  const result = normalizeMeasuredDiagramLayout([
    createProductPartNode({ id: "product-part:project-manager-ui", y: 0, height: 260 }),
    createClusterNode(),
    createModuleNode({
      id: "step-navigator",
      y: 86,
      height: 180,
      parentId: "cluster:workflow-control",
    }),
    createModuleNode({
      id: "action-panel",
      y: 200,
      height: 170,
      parentId: "cluster:workflow-control",
    }),
    createModuleNode({
      id: "core-client",
      y: 340,
      height: 150,
      parentId: "product-part:project-manager-ui",
    }),
  ]);

  const actionPanel = result.find((node) => node.id === "action-panel");
  const clusterNode = result.find((node) => node.id === "cluster:workflow-control");
  const standaloneNode = result.find((node) => node.id === "core-client");
  const productPartNode = result.find((node) => node.id === "product-part:project-manager-ui");

  assert.notEqual(actionPanel, undefined);
  assert.notEqual(clusterNode, undefined);
  assert.notEqual(standaloneNode, undefined);
  assert.notEqual(productPartNode, undefined);
  if (!actionPanel || !clusterNode || !standaloneNode || !productPartNode) {
    return;
  }

  assert.equal(clusterNode.position.y, 140);
  assert.equal(actionPanel.position.y, 316);
  assert.equal(Number(clusterNode.style?.height), 520);
  assert.equal(standaloneNode.position.y, 664);
  assert.equal(Number(productPartNode.style?.height), 848);
  assert.equal(
    standaloneNode.position.y - (clusterNode.position.y + Number(clusterNode.style?.height)),
    MEASURED_LAYOUT_MIN_SAFE_GAP
  );
  assert.equal(
    result.find((node) => node.id === "step-navigator")?.position.y,
    110
  );
});

test("normalizeMeasuredDiagramLayout keeps top-level product parts separated when an earlier container grows", () => {
  const result = normalizeMeasuredDiagramLayout([
    createProductPartNode({ id: "product-part:project-manager-ui", y: 0, height: 260 }),
    createClusterNode(),
    createModuleNode({
      id: "step-navigator",
      y: 86,
      height: 180,
      parentId: "cluster:workflow-control",
    }),
    createModuleNode({
      id: "action-panel",
      y: 200,
      height: 170,
      parentId: "cluster:workflow-control",
    }),
    createModuleNode({
      id: "core-client",
      y: 340,
      height: 150,
      parentId: "product-part:project-manager-ui",
    }),
    createProductPartNode({ id: "product-part:workspace-service", y: 400, height: 260 }),
  ]);

  const firstProductPart = result.find(
    (node) => node.id === "product-part:project-manager-ui"
  );
  const secondProductPart = result.find(
    (node) => node.id === "product-part:workspace-service"
  );

  assert.notEqual(firstProductPart, undefined);
  assert.notEqual(secondProductPart, undefined);
  if (!firstProductPart || !secondProductPart) {
    return;
  }

  assert.equal(Number(firstProductPart.style?.height), 848);
  assert.equal(secondProductPart.position.y, 872);
});

test("normalizeMeasuredDiagramLayout preserves persisted-sidecar composition instead of repacking from seed", () => {
  const result = normalizeMeasuredDiagramLayout(
    [
      createProductPartNode({
        id: "product-part:project-manager-ui",
        y: 0,
        height: 260,
      }),
      {
        ...createClusterNode(),
        position: { x: 24, y: 180 },
      },
      createModuleNode({
        id: "step-navigator",
        y: 140,
        height: 180,
        parentId: "cluster:workflow-control",
      }),
      createModuleNode({
        id: "action-panel",
        y: 360,
        height: 170,
        parentId: "cluster:workflow-control",
      }),
      createModuleNode({
        id: "core-client",
        y: 720,
        height: 150,
        parentId: "product-part:project-manager-ui",
      }),
    ],
    "persisted-sidecar"
  );

  const clusterNode = result.find((node) => node.id === "cluster:workflow-control");
  const standaloneNode = result.find((node) => node.id === "core-client");
  const productPartNode = result.find(
    (node) => node.id === "product-part:project-manager-ui"
  );

  assert.notEqual(clusterNode, undefined);
  assert.notEqual(standaloneNode, undefined);
  assert.notEqual(productPartNode, undefined);
  if (!clusterNode || !standaloneNode || !productPartNode) {
    return;
  }

  assert.equal(clusterNode.position.y, 180);
  assert.equal(standaloneNode.position.y, 748);
  assert.equal(Number(clusterNode.style?.height), 564);
  assert.equal(Number(productPartNode.style?.height), 932);
});

test("normalizeMeasuredDiagramLayout pushes standalone modules below wide clusters when their horizontal bounds overlap", () => {
  const result = normalizeMeasuredDiagramLayout([
    createProductPartNode({
      id: "product-part:project-manager-ui",
      y: 0,
      height: 260,
    }),
    createWideClusterNode(),
    createModuleNode({
      id: "markdown-parser",
      x: 24,
      y: 110,
      height: 180,
      parentId: "cluster:workspace-fs",
    }),
    createModuleNode({
      id: "fs-sync",
      x: 276,
      y: 110,
      height: 170,
      parentId: "cluster:workspace-fs",
    }),
    createModuleNode({
      id: "code-validator",
      x: 344,
      y: 140,
      height: 150,
      parentId: "product-part:project-manager-ui",
    }),
  ]);

  const clusterNode = result.find((node) => node.id === "cluster:workspace-fs");
  const standaloneNode = result.find((node) => node.id === "code-validator");
  const leftClusterModule = result.find((node) => node.id === "markdown-parser");
  const rightClusterModule = result.find((node) => node.id === "fs-sync");

  assert.notEqual(clusterNode, undefined);
  assert.notEqual(standaloneNode, undefined);
  assert.notEqual(leftClusterModule, undefined);
  assert.notEqual(rightClusterModule, undefined);
  if (!clusterNode || !standaloneNode || !leftClusterModule || !rightClusterModule) {
    return;
  }

  assert.equal(clusterNode.position.y, 140);
  assert.equal(leftClusterModule.position.y, 110);
  assert.equal(rightClusterModule.position.y, 110);
  assert.equal(Number(clusterNode.style?.height), 324);
  assert.equal(standaloneNode.position.y, 468);
  assert.equal(
    standaloneNode.position.y - (clusterNode.position.y + Number(clusterNode.style?.height)),
    MEASURED_LAYOUT_MIN_SAFE_GAP
  );
});
