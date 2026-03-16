import assert from "node:assert/strict";
import test from "node:test";
import type { FacadeMapModel } from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import { applyFacadeRelationPatch } from "./apply-facade-relation-patch";

const FIXTURE: FacadeMapModel = {
  version: 1,
  stage: "diagram_facades",
  revision: "facerel",
  updated: "2026-03-16T18:10:00Z",
  facades: [
    {
      id: "auth-facade",
      module: "auth-service",
      kind: "class",
      visibility: "public",
      methods: ["login(credentials): AuthToken"],
      ports: [{ direction: "In", type: "http", target: "api-gateway" }],
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
      methods: ["charge(invoiceId): Receipt"],
      ports: [{ direction: "Out", type: "event", target: "audit-log" }],
      contractTargets: ["contracts/billing-facade.md"],
      codeTargets: ["packages/billing-service/src/billing-facade.ts"],
      origin: "agent",
      status: "proposed",
    },
  ],
  relations: [],
};

test("applyFacadeRelationPatch adds a new relation with user provenance", () => {
  const result = applyFacadeRelationPatch(FIXTURE, {
    type: "add-facade-relation",
    relation: {
      id: "auth-facade__sync-call__billing-facade",
      from: "auth-facade",
      to: "billing-facade",
      type: "sync-call",
      label: "authorize payment",
    },
  });

  assert.equal(result.relations.length, 1);
  assert.deepEqual(result.relations[0], {
    id: "auth-facade__sync-call__billing-facade",
    from: "auth-facade",
    to: "billing-facade",
    type: "sync-call",
    label: "authorize payment",
    notes: undefined,
    origin: "user",
    status: "accepted",
  });
});

test("applyFacadeRelationPatch updates relation fields", () => {
  const seeded = applyFacadeRelationPatch(FIXTURE, {
    type: "add-facade-relation",
    relation: {
      id: "auth-facade__sync-call__billing-facade",
      from: "auth-facade",
      to: "billing-facade",
      type: "sync-call",
    },
  });

  const result = applyFacadeRelationPatch(seeded, {
    type: "update-facade-relation",
    relationId: "auth-facade__sync-call__billing-facade",
    changes: {
      label: "authorize payment",
      notes: "cross-service sync",
      origin: "merged",
    },
  });

  assert.deepEqual(result.relations[0], {
    ...seeded.relations[0],
    label: "authorize payment",
    notes: "cross-service sync",
    origin: "merged",
  });
});

test("applyFacadeRelationPatch rejects unknown endpoints", () => {
  assert.throws(
    () =>
      applyFacadeRelationPatch(FIXTURE, {
        type: "add-facade-relation",
        relation: {
          id: "unknown__sync-call__billing-facade",
          from: "unknown-facade",
          to: "billing-facade",
          type: "sync-call",
        },
      }),
    /unknown-facade/
  );
});
