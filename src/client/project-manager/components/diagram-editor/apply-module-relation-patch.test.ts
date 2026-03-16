import assert from "node:assert/strict";
import test from "node:test";
import type { ModuleMapModel } from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import { applyModuleRelationPatch } from "./apply-module-relation-patch";

const FIXTURE: ModuleMapModel = {
  version: 1,
  stage: "diagram_modules",
  revision: "cafebabe",
  updated: "2026-03-16T18:30:00Z",
  modules: [
    {
      id: "api-gateway",
      kind: "gateway",
      title: "API Gateway",
      responsibility: "Routes requests",
      inputs: ["http-request"],
      outputs: ["command"],
      contractTargets: [],
      codeTargets: [],
      origin: "agent",
      status: "accepted",
    },
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
  relations: [],
};

test("applyModuleRelationPatch adds relation with user origin", () => {
  const result = applyModuleRelationPatch(FIXTURE, {
    type: "add-relation",
    relation: {
      id: "api-gateway__sync-call__auth-service",
      from: "api-gateway",
      to: "auth-service",
      type: "sync-call",
      label: "authorize()",
      criticality: "high",
    },
  });

  assert.equal(result.relations.length, 1);
  assert.equal(result.relations[0]?.origin, "user");
  assert.equal(result.relations[0]?.status, "accepted");
});

test("applyModuleRelationPatch updates relation fields", () => {
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
  };

  const result = applyModuleRelationPatch(withRelation, {
    type: "update-relation",
    relationId: "api-gateway__sync-call__auth-service",
    changes: {
      type: "shared-data",
      label: "session cache",
      origin: "merged",
    },
  });

  assert.equal(result.relations[0]?.type, "shared-data");
  assert.equal(result.relations[0]?.label, "session cache");
  assert.equal(result.relations[0]?.origin, "merged");
});

test("applyModuleRelationPatch deletes relation", () => {
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
  };

  const result = applyModuleRelationPatch(withRelation, {
    type: "delete-relation",
    relationId: "api-gateway__sync-call__auth-service",
  });

  assert.equal(result.relations.length, 0);
});
