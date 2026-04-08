import assert from "node:assert/strict";
import test from "node:test";
import {
  applyFlowSidecarPositions,
  buildFlowSidecarDocument,
  FLOW_SIDECAR_LAYOUT_METRIC_VERSION,
  parseFlowSidecar,
  serializeFlowSidecar,
} from "./flow-sidecar-types";
import type { DiagramFlowNode } from "./adapters/domain-model-to-react-flow.types";

const makeProductPartNode = (
  id: string,
  position: { x: number; y: number },
): DiagramFlowNode => ({
  id: `product-part:${id}`,
  type: "productPart",
  position,
  data: {
    stage: "diagram_modules",
    nodeKind: "productPart",
    productPartId: id,
    title: id,
    purpose: `Purpose of ${id}`,
    clusterIds: [],
    standaloneModuleIds: [],
    clusters: [],
    standaloneModules: [],
    layoutParams: { columns: "auto", targetAspectRatio: "landscape" },
  },
});

test("flow sidecar serializes manual node positions", () => {
  const document = buildFlowSidecarDocument({
    revision: "rev-1",
    nodes: [makeProductPartNode("control-shell", { x: 120, y: 240 })],
  });

  const parsed = parseFlowSidecar(serializeFlowSidecar(document));

  assert.notEqual(parsed, null);
  assert.equal(
    parsed?.layoutMetricVersion,
    FLOW_SIDECAR_LAYOUT_METRIC_VERSION
  );
  assert.deepEqual(parsed?.nodes["product-part:control-shell"], { x: 120, y: 240 });
});

test("flow sidecar ignores legacy layout profile fields", () => {
  const parsed = parseFlowSidecar(
    JSON.stringify({
      version: 1,
      revision: "rev-2",
      updated: new Date().toISOString(),
      nodes: {
        "product-part:shell": { x: 0, y: 0 },
      },
      layoutProfile: "fill_space",
    })
  );

  assert.notEqual(parsed, null);
  assert.equal("layoutProfile" in (parsed ?? {}), false);
  assert.deepEqual(parsed?.nodes["product-part:shell"], { x: 0, y: 0 });
});

test("flow sidecar preserves product part positions as layout-only data", () => {
  const document = buildFlowSidecarDocument({
    revision: "rev-nested",
    nodes: [
      makeProductPartNode("control-shell", { x: 40, y: 24 }),
      makeProductPartNode("runtime", { x: 0, y: 400 }),
    ],
  });

  assert.deepEqual(document.nodes["product-part:control-shell"], { x: 40, y: 24 });
  assert.deepEqual(document.nodes["product-part:runtime"], { x: 0, y: 400 });
});

test("flow sidecar applies saved positions only when the diagram revision matches", () => {
  const nodes = [makeProductPartNode("control-shell", { x: 0, y: 0 })];

  const applied = applyFlowSidecarPositions({
    nodes,
    document: {
      version: 1,
      revision: "rev-match",
      layoutMetricVersion: FLOW_SIDECAR_LAYOUT_METRIC_VERSION,
      updated: new Date().toISOString(),
      nodes: { "product-part:control-shell": { x: 240, y: 160 } },
    },
    revision: "rev-match",
  });
  const skipped = applyFlowSidecarPositions({
    nodes,
    document: {
      version: 1,
      revision: "rev-stale",
      layoutMetricVersion: FLOW_SIDECAR_LAYOUT_METRIC_VERSION,
      updated: new Date().toISOString(),
      nodes: { "product-part:control-shell": { x: 480, y: 320 } },
    },
    revision: "rev-current",
  });

  assert.deepEqual(applied[0]?.position, { x: 240, y: 160 });
  assert.deepEqual(skipped[0]?.position, { x: 0, y: 0 });
});

test("flow sidecar falls back to computed layout when layout metric version changes", () => {
  const nodes = [makeProductPartNode("control-shell", { x: 10, y: 20 })];

  const result = applyFlowSidecarPositions({
    nodes,
    document: {
      version: 1,
      revision: "rev-match",
      layoutMetricVersion: FLOW_SIDECAR_LAYOUT_METRIC_VERSION + 1,
      updated: new Date().toISOString(),
      nodes: { "product-part:control-shell": { x: 240, y: 160 } },
    },
    revision: "rev-match",
  });

  assert.deepEqual(result[0]?.position, { x: 10, y: 20 });
});

test("flow sidecar falls back to computed layout when sidecar does not cover all nodes", () => {
  const nodes = [
    makeProductPartNode("shell", { x: 10, y: 20 }),
    makeProductPartNode("runtime", { x: 400, y: 20 }),
  ];

  const result = applyFlowSidecarPositions({
    nodes,
    document: {
      version: 1,
      revision: "rev-partial",
      layoutMetricVersion: FLOW_SIDECAR_LAYOUT_METRIC_VERSION,
      updated: new Date().toISOString(),
      nodes: { "product-part:shell": { x: 500, y: 600 } },
    },
    revision: "rev-partial",
  });

  assert.deepEqual(result[0]?.position, { x: 10, y: 20 });
  assert.deepEqual(result[1]?.position, { x: 400, y: 20 });
});
