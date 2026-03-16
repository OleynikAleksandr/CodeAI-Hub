import assert from "node:assert/strict";
import test from "node:test";
import type { ModuleMapModel } from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import { domainModelToReactFlow } from "./domain-model-to-react-flow";

const MODULE_MAP_FIXTURE: ModuleMapModel = {
  version: 1,
  stage: "diagram_modules",
  revision: "deadbeef",
  updated: "2026-03-16T18:30:00Z",
  modules: [
    {
      id: "api-gateway",
      kind: "gateway",
      title: "API Gateway",
      responsibility: "Routes external requests into the platform.",
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

test("domainModelToReactFlow projects module map into cluster/module nodes and relation edges", () => {
  const result = domainModelToReactFlow(MODULE_MAP_FIXTURE);

  assert.equal(result.stage, "diagram_modules");
  assert.equal(result.revision, "deadbeef");
  assert.equal(result.nodes.length, 5);
  assert.equal(result.edges.length, 2);

  assert.deepEqual(
    result.nodes.map((node) => node.id),
    [
      "cluster:delivery",
      "cluster:security",
      "api-gateway",
      "auth-service",
      "config-store",
    ]
  );

  const deliveryCluster = result.nodes[0];
  assert.equal(deliveryCluster.type, "cluster");
  assert.deepEqual(deliveryCluster.data, {
    stage: "diagram_modules",
    nodeKind: "cluster",
    clusterId: "delivery",
    title: "delivery",
    moduleIds: ["api-gateway"],
  });

  const gatewayNode = result.nodes[2];
  assert.equal(gatewayNode.type, "module");
  assert.equal(gatewayNode.parentId, "cluster:delivery");
  assert.equal(gatewayNode.extent, "parent");
  assert.deepEqual(gatewayNode.position, { x: 32, y: 72 });
  assert.deepEqual(gatewayNode.data, {
    stage: "diagram_modules",
    nodeKind: "module",
    moduleId: "api-gateway",
    title: "API Gateway",
    kind: "gateway",
    responsibility: "Routes external requests into the platform.",
    status: "proposed",
    origin: "agent",
    cluster: "delivery",
    inputCount: 1,
    outputCount: 1,
  });

  const ungroupedNode = result.nodes[4];
  assert.equal(ungroupedNode.parentId, undefined);
  assert.equal(ungroupedNode.extent, undefined);
  assert.deepEqual(ungroupedNode.position, { x: 0, y: 72 });

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
