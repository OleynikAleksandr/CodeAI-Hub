import assert from "node:assert/strict";
import test from "node:test";
import type { ModuleMapModel } from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import { mergeModuleConflicts } from "./module-conflict-merge";

const BASE: ModuleMapModel = {
  version: 1,
  stage: "diagram_modules",
  revision: "r1",
  updated: "2026-03-16T18:30:00Z",
  modules: [
    {
      id: "api-gateway",
      kind: "gateway",
      title: "API Gateway",
      responsibility: "Routes requests",
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

test("mergeModuleConflicts reapplies local module patches over incoming model", () => {
  const incoming: ModuleMapModel = {
    ...BASE,
    revision: "r2",
    modules: [
      ...BASE.modules,
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
        status: "proposed",
      },
    ],
  };

  const result = mergeModuleConflicts({
    incoming,
    patches: [
      {
        type: "update-module",
        moduleId: "api-gateway",
        changes: {
          title: "Edge Gateway",
          origin: "merged",
        },
      },
      {
        type: "add-relation",
        relation: {
          id: "api-gateway__sync-call__auth-service",
          from: "api-gateway",
          to: "auth-service",
          type: "sync-call",
        },
      },
    ],
  });

  assert.equal(result.conflicts.length, 0);
  assert.equal(
    result.model.modules.find((entity) => entity.id === "api-gateway")?.title,
    "Edge Gateway"
  );
  assert.equal(result.model.relations.length, 1);
});

test("mergeModuleConflicts collects patch failures as conflicts", () => {
  const result = mergeModuleConflicts({
    incoming: BASE,
    patches: [
      {
        type: "add-relation",
        relation: {
          id: "api-gateway__sync-call__missing-service",
          from: "api-gateway",
          to: "missing-service",
          type: "sync-call",
        },
      },
    ],
  });

  assert.equal(result.model.relations.length, 0);
  assert.equal(result.conflicts.length, 1);
});
