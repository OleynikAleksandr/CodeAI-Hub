import type { ModuleMapModel } from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import assert from "node:assert/strict";
import test from "node:test";
import { domainModelToReactFlow } from "./domain-model-to-react-flow";

const MODULE_MAP_FIXTURE: ModuleMapModel = {
  version: 1,
  stage: "diagram_modules",
  revision: "deadbeef",
  updated: "2026-03-16T18:30:00Z",
  productParts: [
    {
      id: "control-shell",
      title: "Control Shell",
      purpose: "Owns the operator-facing surface and runtime entrypoint.",
      clusterIds: ["delivery", "security"],
      standaloneModuleIds: ["config-store"],
    },
  ],
  clusters: [
    {
      id: "delivery",
      title: "Delivery",
      purpose: "Owns request delivery into the product.",
      productPart: "control-shell",
      moduleIds: ["api-gateway"],
    },
    {
      id: "security",
      title: "Security",
      purpose: "Owns authentication and session protection.",
      productPart: "control-shell",
      moduleIds: ["auth-service"],
    },
  ],
  modules: [
    {
      id: "api-gateway",
      kind: "gateway",
      title: "API Gateway",
      responsibility: "Routes external requests into the platform.",
      productPart: "control-shell",
      cluster: "delivery",
      inputs: ["http-request"],
      outputs: ["command"],
      contractTargets: ["contracts/api-gateway-facade.md"],
      codeTargets: ["packages/api-gateway/"],
      origin: "agent",
      status: "proposed",
    },
    {
      id: "auth-service",
      kind: "service",
      title: "Auth Service",
      responsibility: "Authenticates operators and sessions.",
      productPart: "control-shell",
      cluster: "security",
      inputs: ["credentials"],
      outputs: ["access-token"],
      contractTargets: ["contracts/auth-service-facade.md"],
      codeTargets: ["packages/auth-service/"],
      origin: "user",
      status: "accepted",
    },
    {
      id: "config-store",
      kind: "store",
      title: "Config Store",
      responsibility: "Stores deployment configuration.",
      productPart: "control-shell",
      inputs: ["config-write"],
      outputs: ["config-read"],
      contractTargets: [],
      codeTargets: ["packages/config-store/"],
      origin: "merged",
      status: "proposed",
    },
  ],
  relations: [
    {
      id: "api-gateway__sync-call__auth-service",
      from: "api-gateway",
      to: "auth-service",
      type: "sync-call",
      label: "authorize()",
      criticality: "high",
      origin: "agent",
      status: "proposed",
    },
    {
      id: "auth-service__shared-data__config-store",
      from: "auth-service",
      to: "config-store",
      type: "shared-data",
      origin: "user",
      status: "accepted",
    },
  ],
};


test("domainModelToReactFlow projects module map into product part, cluster, and module hierarchy", () => {
  const result = domainModelToReactFlow(MODULE_MAP_FIXTURE);

  assert.equal(result.stage, "diagram_modules");
  assert.equal(result.revision, "deadbeef");
  assert.equal(result.nodes.length, 6);
  assert.equal(result.edges.length, 2);

  assert.deepEqual(
    result.nodes.map((node) => node.id),
    [
      "product-part:control-shell",
      "cluster:delivery",
      "cluster:security",
      "api-gateway",
      "auth-service",
      "config-store",
    ]
  );

  const productPartNode = result.nodes[0];
  assert.equal(productPartNode.type, "cluster");
  assert.equal(productPartNode.parentId, undefined);
  assert.equal(productPartNode.extent, undefined);
  assert.equal(productPartNode.style?.width, 720);
  assert.deepEqual(productPartNode.data, {
    stage: "diagram_modules",
    nodeKind: "productPart",
    productPartId: "control-shell",
    title: "Control Shell",
    clusterIds: ["delivery", "security"],
    standaloneModuleIds: ["config-store"],
  });

  const deliveryCluster = result.nodes[1];
  assert.equal(deliveryCluster.type, "cluster");
  assert.equal(deliveryCluster.parentId, "product-part:control-shell");
  assert.equal(deliveryCluster.extent, "parent");
  assert.deepEqual(deliveryCluster.data, {
    stage: "diagram_modules",
    nodeKind: "cluster",
    clusterId: "delivery",
    productPartId: "control-shell",
    title: "Delivery",
    moduleIds: ["api-gateway"],
  });

  const gatewayNode = result.nodes[3];
  assert.equal(gatewayNode.type, "module");
  assert.equal(gatewayNode.parentId, "cluster:delivery");
  assert.equal(gatewayNode.extent, "parent");
  assert.deepEqual(gatewayNode.position, { x: 24, y: 72 });
  assert.deepEqual(gatewayNode.data, {
    stage: "diagram_modules",
    nodeKind: "module",
    moduleId: "api-gateway",
    title: "API Gateway",
    kind: "gateway",
    responsibility: "Routes external requests into the platform.",
    status: "proposed",
    origin: "agent",
    productPart: "control-shell",
    cluster: "delivery",
    inputCount: 1,
    outputCount: 1,
  });

  assert.equal(
    result.nodes
      .filter((node) => node.type === "module")
      .every((node) => typeof node.parentId === "string" && node.extent === "parent"),
    true
  );

  const standaloneNode = result.nodes[5];
  assert.equal(standaloneNode.parentId, "product-part:control-shell");
  assert.equal(standaloneNode.extent, "parent");
  assert.deepEqual(standaloneNode.position, { x: 24, y: 328 });

  assert.deepEqual(result.edges, [
    {
      id: "api-gateway__sync-call__auth-service",
      type: "relation",
      source: "api-gateway",
      target: "auth-service",
      label: "authorize()",
      data: {
        stage: "diagram_modules",
        edgeKind: "relation",
        relationId: "api-gateway__sync-call__auth-service",
        relationType: "sync-call",
        criticality: "high",
        label: "authorize()",
        origin: "agent",
        status: "proposed",
      },
    },
    {
      id: "auth-service__shared-data__config-store",
      type: "relation",
      source: "auth-service",
      target: "config-store",
      label: undefined,
      data: {
        stage: "diagram_modules",
        edgeKind: "relation",
        relationId: "auth-service__shared-data__config-store",
        relationType: "shared-data",
        criticality: undefined,
        label: undefined,
        origin: "user",
        status: "accepted",
      },
    },
  ]);
});
