import type {
  FacadeMapModel,
  ModuleMapModel,
} from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import assert from "node:assert/strict";
import test from "node:test";
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

const FACADE_MAP_FIXTURE: FacadeMapModel = {
  version: 1,
  stage: "diagram_facades",
  revision: "cafebabe",
  updated: "2026-03-16T18:45:00Z",
  facades: [
    {
      id: "auth-facade",
      module: "auth-service",
      kind: "class",
      visibility: "public",
      methods: ["login(credentials): AuthToken", "logout(sessionId): void"],
      ports: [
        { direction: "In", type: "http", target: "api-gateway" },
        { direction: "Out", type: "event", target: "audit-log" },
      ],
      contractTargets: ["contracts/auth-facade.md"],
      codeTargets: ["packages/auth-service/src/auth-facade.ts"],
      origin: "agent",
      status: "proposed",
    },
    {
      id: "billing-facade",
      module: "billing-service",
      kind: "class",
      visibility: "internal",
      methods: ["charge(invoiceId): ChargeResult"],
      ports: [{ direction: "In", type: "event", target: "billing-queue" }],
      contractTargets: ["contracts/billing-facade.md"],
      codeTargets: ["packages/billing-service/src/billing-facade.ts"],
      origin: "user",
      status: "accepted",
    },
  ],
  relations: [
    {
      id: "api-gateway__sync-call__auth-facade",
      from: "api-gateway",
      to: "auth-facade",
      type: "sync-call",
      label: "POST /login",
      origin: "agent",
      status: "proposed",
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

test("domainModelToReactFlow projects facade map into stage-aware facade nodes and edges", () => {
  const result = domainModelToReactFlow(FACADE_MAP_FIXTURE);

  assert.equal(result.stage, "diagram_facades");
  assert.equal(result.revision, "cafebabe");
  assert.equal(result.nodes.length, 2);
  assert.equal(result.edges.length, 1);
  assert.deepEqual(
    result.nodes.map((node) => node.id),
    ["auth-facade", "billing-facade"]
  );

  assert.deepEqual(result.nodes[0], {
    id: "auth-facade",
    type: "facade",
    position: { x: 0, y: 72 },
    data: {
      stage: "diagram_facades",
      nodeKind: "facade",
      facadeId: "auth-facade",
      moduleId: "auth-service",
      visibility: "public",
      methodCount: 2,
      methods: ["login(credentials): AuthToken", "logout(sessionId): void"],
      ports: [
        { direction: "In", type: "http", target: "api-gateway" },
        { direction: "Out", type: "event", target: "audit-log" },
      ],
      status: "proposed",
      origin: "agent",
    },
  });

  assert.deepEqual(result.edges, [
    {
      id: "api-gateway__sync-call__auth-facade",
      type: "relation",
      source: "api-gateway",
      target: "auth-facade",
      label: "POST /login",
      data: {
        stage: "diagram_facades",
        edgeKind: "relation",
        relationId: "api-gateway__sync-call__auth-facade",
        relationType: "sync-call",
        criticality: undefined,
        label: "POST /login",
        origin: "agent",
        status: "proposed",
      },
    },
  ]);
});
