import type { FacadeMapModel } from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import assert from "node:assert/strict";
import test from "node:test";
import { domainModelToReactFlow } from "./domain-model-to-react-flow";

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
