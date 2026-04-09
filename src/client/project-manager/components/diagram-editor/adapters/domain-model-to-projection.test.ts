import type { ModuleMapModel } from "../../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import assert from "node:assert/strict";
import test from "node:test";
import { domainModelToProjection } from "./domain-model-to-projection";
import type { ProductPartProjectionNodeData } from "./domain-model-to-projection.types";

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

test("domainModelToProjection emits one ProductPart node with nested clusters and modules", () => {
  const result = domainModelToProjection(MODULE_MAP_FIXTURE);

  assert.equal(result.stage, "diagram_modules");
  assert.equal(result.revision, "deadbeef");
  assert.equal(result.nodes.length, 1);

  const ppNode = result.nodes[0]!;
  assert.equal(ppNode.id, "product-part:control-shell");
  assert.equal(ppNode.type, "productPart");
  assert.equal(ppNode.data.nodeKind, "productPart");

  const data = ppNode.data as ProductPartProjectionNodeData;
  assert.equal(data.productPartId, "control-shell");
  assert.equal(data.title, "Control Shell");
  assert.equal(data.clusters.length, 2);
  assert.equal(data.standaloneModules.length, 1);

  const delivery = data.clusters[0]!;
  assert.equal(delivery.clusterId, "delivery");
  assert.equal(delivery.modules.length, 1);
  assert.equal(delivery.modules[0]!.moduleId, "api-gateway");
  assert.equal(delivery.modules[0]!.kind, "gateway");
  assert.equal(delivery.modules[0]!.cluster, "delivery");

  const security = data.clusters[1]!;
  assert.equal(security.clusterId, "security");
  assert.equal(security.modules.length, 1);
  assert.equal(security.modules[0]!.moduleId, "auth-service");

  const standalone = data.standaloneModules[0]!;
  assert.equal(standalone.moduleId, "config-store");
  assert.equal(standalone.cluster, undefined);
  assert.equal(standalone.productPart, "control-shell");
});

test("domainModelToProjection projection has no edges", () => {
  const result = domainModelToProjection(MODULE_MAP_FIXTURE);
  assert.equal("edges" in result, false);
});
