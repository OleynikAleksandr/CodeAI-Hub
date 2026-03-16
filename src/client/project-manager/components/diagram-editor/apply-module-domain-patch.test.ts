import assert from "node:assert/strict";
import test from "node:test";
import type { ModuleMapModel } from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import { applyModuleDomainPatch } from "./apply-module-domain-patch";

const FIXTURE: ModuleMapModel = {
  version: 1,
  stage: "diagram_modules",
  revision: "deadbeef",
  updated: "2026-03-16T18:30:00Z",
  modules: [
    {
      id: "api-gateway",
      kind: "gateway",
      title: "API Gateway",
      responsibility: "Routes requests",
      cluster: "delivery",
      inputs: ["http-request"],
      outputs: ["command"],
      contractTargets: ["contracts/api-gateway.md"],
      codeTargets: ["packages/api-gateway/"],
      origin: "agent",
      status: "proposed",
    },
  ],
  relations: [],
};

test("applyModuleDomainPatch adds a new module with user origin", () => {
  const result = applyModuleDomainPatch(FIXTURE, {
    type: "add-module",
    module: {
      id: "billing-service",
      kind: "service",
      title: "Billing Service",
      responsibility: "Handles invoices",
      inputs: ["invoice"],
      outputs: ["charge-result"],
      contractTargets: ["contracts/billing.md"],
      codeTargets: ["packages/billing/"],
    },
  });

  assert.equal(result.modules.length, 2);
  const added = result.modules.find((entity) => entity.id === "billing-service");
  assert.ok(added);
  assert.equal(added.origin, "user");
  assert.equal(added.status, "accepted");
  assert.notEqual(result.revision, FIXTURE.revision);
});

test("applyModuleDomainPatch updates an existing module", () => {
  const result = applyModuleDomainPatch(FIXTURE, {
    type: "update-module",
    moduleId: "api-gateway",
    changes: {
      title: "Edge Gateway",
      responsibility: "Routes and rate-limits requests",
      origin: "merged",
    },
  });

  assert.equal(result.modules[0]?.title, "Edge Gateway");
  assert.equal(
    result.modules[0]?.responsibility,
    "Routes and rate-limits requests"
  );
  assert.equal(result.modules[0]?.origin, "merged");
});

test("applyModuleDomainPatch deletes module and dependent relations", () => {
  const withRelation: ModuleMapModel = {
    ...FIXTURE,
    relations: [
      {
        id: "api-gateway__sync-call__auth-service",
        from: "api-gateway",
        to: "auth-service",
        type: "sync-call",
        origin: "agent",
        status: "proposed",
      },
    ],
    modules: [
      ...FIXTURE.modules,
      {
        id: "auth-service",
        kind: "service",
        title: "Auth Service",
        responsibility: "Authenticates",
        inputs: [],
        outputs: [],
        contractTargets: [],
        codeTargets: [],
        origin: "agent",
        status: "accepted",
      },
    ],
  };

  const result = applyModuleDomainPatch(withRelation, {
    type: "delete-module",
    moduleId: "auth-service",
  });

  assert.equal(result.modules.length, 1);
  assert.equal(result.relations.length, 0);
});
