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

test("normalizeMeasuredDiagramLayout pushes overlapping cluster and standalone children downward using measured heights", () => {
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

  assert.equal(actionPanel.position.y, 270);
  assert.equal(Number(clusterNode.style?.height), 452);
  assert.equal(standaloneNode.position.y, 566);
  assert.equal(Number(productPartNode.style?.height), 728);
  assert.equal(
    standaloneNode.position.y - (clusterNode.position.y + Number(clusterNode.style?.height)),
    MEASURED_LAYOUT_MIN_SAFE_GAP
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

  assert.equal(Number(firstProductPart.style?.height), 728);
  assert.equal(secondProductPart.position.y, 752);
});
