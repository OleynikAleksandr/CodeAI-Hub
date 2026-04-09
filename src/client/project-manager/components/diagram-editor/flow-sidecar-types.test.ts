import assert from "node:assert/strict";
import test from "node:test";
import type {
  ClusterFlowNodeData,
  DiagramFlowNode,
} from "./adapters/domain-model-to-react-flow.types";
import type {
  ClusterLayoutParams,
  ProductPartLayoutParams,
} from "./diagram-editor-layout-params";
import {
  applyFlowSidecarLayoutParams,
  applyFlowSidecarPositions,
  buildFlowSidecarDocument,
  FLOW_SIDECAR_LAYOUT_METRIC_VERSION,
  type FlowSidecarDocument,
  parseFlowSidecar,
  serializeFlowSidecar,
} from "./flow-sidecar-types";

const makeCluster = (
  clusterId: string,
  layoutParams: ClusterLayoutParams = { moduleColumns: "auto" }
): ClusterFlowNodeData => ({
  stage: "diagram_modules",
  nodeKind: "cluster",
  clusterId,
  productPartId: "control-shell",
  title: clusterId,
  purpose: `Purpose of ${clusterId}`,
  moduleIds: [],
  modules: [],
  layoutParams,
});

const makeProductPartNode = (
  id: string,
  layoutParams: ProductPartLayoutParams = {
    columns: "auto",
    targetAspectRatio: "landscape",
  },
  clusters: readonly ClusterFlowNodeData[] = []
): DiagramFlowNode => ({
  id: `product-part:${id}`,
  type: "productPart",
  data: {
    stage: "diagram_modules",
    nodeKind: "productPart",
    productPartId: id,
    title: id,
    purpose: `Purpose of ${id}`,
    clusterIds: clusters.map((c) => c.clusterId),
    standaloneModuleIds: [],
    clusters,
    standaloneModules: [],
    layoutParams,
  },
});

test("flow sidecar serializes node entries with zero positions (v2)", () => {
  const document = buildFlowSidecarDocument({
    revision: "rev-1",
    nodes: [makeProductPartNode("control-shell")],
  });

  const parsed = parseFlowSidecar(serializeFlowSidecar(document));

  assert.notEqual(parsed, null);
  assert.equal(parsed?.version, 2);
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

test("parseFlowSidecar accepts legacy v1 payload without layoutParams", () => {
  const parsed = parseFlowSidecar(
    JSON.stringify({
      version: 1,
      revision: "rev-v1",
      updated: new Date().toISOString(),
      nodes: {
        "product-part:shell": { x: 0, y: 0 },
      },
    })
  );

  assert.notEqual(parsed, null);
  assert.equal(parsed?.version, 1);
  assert.equal(parsed?.layoutParams, undefined);
  assert.deepEqual(parsed?.nodes["product-part:shell"], { x: 0, y: 0 });
});

test("flow sidecar v2 round-trip preserves layoutParams for ProductPart and Cluster", () => {
  const cluster = makeCluster("auth-cluster", { moduleColumns: 3 });
  const node = makeProductPartNode(
    "control-shell",
    { columns: 4, targetAspectRatio: "wide" },
    [cluster]
  );

  const document = buildFlowSidecarDocument({
    revision: "rev-round",
    nodes: [node],
  });
  const parsed = parseFlowSidecar(serializeFlowSidecar(document));

  assert.notEqual(parsed, null);
  assert.equal(parsed?.version, 2);
  assert.deepEqual(parsed?.layoutParams?.productParts["control-shell"], {
    columns: 4,
    targetAspectRatio: "wide",
  });
  assert.deepEqual(parsed?.layoutParams?.clusters["auth-cluster"], {
    moduleColumns: 3,
  });
});

test("parseFlowSidecar drops layoutParams entries with invalid enum values", () => {
  const parsed = parseFlowSidecar(
    JSON.stringify({
      version: 2,
      revision: "rev-invalid",
      updated: new Date().toISOString(),
      nodes: { "product-part:shell": { x: 0, y: 0 } },
      layoutParams: {
        productParts: {
          shell: { columns: "auto", targetAspectRatio: "landscape" },
          bogus: { columns: 7, targetAspectRatio: "landscape" },
          also_bogus: { columns: "auto", targetAspectRatio: "panoramic" },
        },
        clusters: {
          "auth-cluster": { moduleColumns: 2 },
          "bad-cluster": { moduleColumns: 9 },
        },
      },
    })
  );

  assert.notEqual(parsed, null);
  assert.deepEqual(Object.keys(parsed?.layoutParams?.productParts ?? {}), [
    "shell",
  ]);
  assert.deepEqual(Object.keys(parsed?.layoutParams?.clusters ?? {}), [
    "auth-cluster",
  ]);
});

test("parseFlowSidecar v2 without layoutParams section yields undefined layoutParams", () => {
  const parsed = parseFlowSidecar(
    JSON.stringify({
      version: 2,
      revision: "rev-empty-lp",
      updated: new Date().toISOString(),
      nodes: { "product-part:shell": { x: 0, y: 0 } },
    })
  );

  assert.notEqual(parsed, null);
  assert.equal(parsed?.version, 2);
  assert.equal(parsed?.layoutParams, undefined);
});

test("parseFlowSidecar returns null for corrupt JSON", () => {
  assert.equal(parseFlowSidecar("{not json"), null);
});

const makeLayoutDocument = (
  layoutParams: FlowSidecarDocument["layoutParams"]
): FlowSidecarDocument => ({
  version: 2,
  revision: "rev-apply",
  layoutMetricVersion: FLOW_SIDECAR_LAYOUT_METRIC_VERSION,
  updated: new Date().toISOString(),
  nodes: {},
  layoutParams,
});

test("applyFlowSidecarLayoutParams overrides ProductPart layout params", () => {
  const nodes = [makeProductPartNode("control-shell")];
  const result = applyFlowSidecarLayoutParams({
    nodes,
    document: makeLayoutDocument({
      productParts: {
        "control-shell": { columns: 3, targetAspectRatio: "wide" },
      },
      clusters: {},
    }),
  });

  assert.notEqual(result, nodes);
  assert.deepEqual(result[0]?.data.layoutParams, {
    columns: 3,
    targetAspectRatio: "wide",
  });
});

test("applyFlowSidecarLayoutParams overrides Cluster module columns", () => {
  const cluster = makeCluster("auth-cluster");
  const nodes = [makeProductPartNode("control-shell", undefined, [cluster])];
  const result = applyFlowSidecarLayoutParams({
    nodes,
    document: makeLayoutDocument({
      productParts: {},
      clusters: { "auth-cluster": { moduleColumns: 2 } },
    }),
  });

  assert.notEqual(result, nodes);
  assert.equal(result[0]?.data.clusters[0]?.layoutParams.moduleColumns, 2);
  assert.deepEqual(result[0]?.data.layoutParams, {
    columns: "auto",
    targetAspectRatio: "landscape",
  });
});

test("applyFlowSidecarLayoutParams handles both ProductPart and Cluster overrides", () => {
  const cluster = makeCluster("auth-cluster");
  const nodes = [
    makeProductPartNode(
      "control-shell",
      { columns: "auto", targetAspectRatio: "landscape" },
      [cluster]
    ),
  ];
  const result = applyFlowSidecarLayoutParams({
    nodes,
    document: makeLayoutDocument({
      productParts: {
        "control-shell": { columns: 4, targetAspectRatio: "square" },
      },
      clusters: { "auth-cluster": { moduleColumns: 3 } },
    }),
  });

  assert.notEqual(result, nodes);
  assert.deepEqual(result[0]?.data.layoutParams, {
    columns: 4,
    targetAspectRatio: "square",
  });
  assert.equal(result[0]?.data.clusters[0]?.layoutParams.moduleColumns, 3);
});

test("applyFlowSidecarLayoutParams returns original reference when nothing matches", () => {
  const nodes = [
    makeProductPartNode("control-shell", undefined, [
      makeCluster("auth-cluster"),
    ]),
  ];
  const result = applyFlowSidecarLayoutParams({
    nodes,
    document: makeLayoutDocument({
      productParts: {
        "other-part": { columns: 5, targetAspectRatio: "wide" },
      },
      clusters: { "other-cluster": { moduleColumns: 3 } },
    }),
  });

  assert.equal(result, nodes);
});

test("applyFlowSidecarLayoutParams returns original reference when document lacks layoutParams", () => {
  const nodes = [makeProductPartNode("control-shell")];
  const result = applyFlowSidecarLayoutParams({
    nodes,
    document: {
      version: 1,
      revision: "rev-v1",
      layoutMetricVersion: FLOW_SIDECAR_LAYOUT_METRIC_VERSION,
      updated: new Date().toISOString(),
      nodes: {},
    },
  });

  assert.equal(result, nodes);
});

test("applyFlowSidecarLayoutParams returns original reference when document is null", () => {
  const nodes = [makeProductPartNode("control-shell")];
  const result = applyFlowSidecarLayoutParams({ nodes, document: null });
  assert.equal(result, nodes);
});

test("buildFlowSidecarDocument sorts productParts and clusters alphabetically", () => {
  const clusterZ = makeCluster("zeta-cluster");
  const clusterA = makeCluster("alpha-cluster", { moduleColumns: 2 });
  const partB = makeProductPartNode(
    "beta-part",
    { columns: 3, targetAspectRatio: "square" },
    [clusterZ, clusterA]
  );
  const partA = makeProductPartNode("alpha-part");

  const document = buildFlowSidecarDocument({
    revision: "rev-sort",
    nodes: [partB, partA],
  });

  assert.deepEqual(Object.keys(document.layoutParams?.productParts ?? {}), [
    "alpha-part",
    "beta-part",
  ]);
  assert.deepEqual(Object.keys(document.layoutParams?.clusters ?? {}), [
    "alpha-cluster",
    "zeta-cluster",
  ]);
});
