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

const makeProductPartNode = (id: string): DiagramFlowNode => ({
  id: `product-part:${id}`,
  type: "productPart",
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

test("flow sidecar serializes node entries with zero positions", () => {
  const document = buildFlowSidecarDocument({
    revision: "rev-1",
    nodes: [makeProductPartNode("control-shell")],
  });

  const parsed = parseFlowSidecar(serializeFlowSidecar(document));

  assert.notEqual(parsed, null);
  assert.equal(
    parsed?.layoutMetricVersion,
    FLOW_SIDECAR_LAYOUT_METRIC_VERSION
  );
  assert.deepEqual(parsed?.nodes["product-part:control-shell"], { x: 0, y: 0 });
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

test("flow sidecar buildFlowSidecarDocument includes all node IDs", () => {
  const document = buildFlowSidecarDocument({
    revision: "rev-nested",
    nodes: [
      makeProductPartNode("control-shell"),
      makeProductPartNode("runtime"),
    ],
  });

  assert.equal("product-part:control-shell" in document.nodes, true);
  assert.equal("product-part:runtime" in document.nodes, true);
  assert.equal(document.revision, "rev-nested");
});

test("applyFlowSidecarPositions is a pass-through (CSS Grid manages layout)", () => {
  const nodes = [makeProductPartNode("control-shell")];

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

  assert.equal(applied, nodes);
});

test("applyFlowSidecarPositions returns original nodes when document is null", () => {
  const nodes = [
    makeProductPartNode("shell"),
    makeProductPartNode("runtime"),
  ];

  const result = applyFlowSidecarPositions({
    nodes,
    document: null,
    revision: "rev-any",
  });

  assert.equal(result, nodes);
});
