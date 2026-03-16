import assert from "node:assert/strict";
import test from "node:test";
import type { FacadeMapModel } from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import { applyFacadeDomainPatch } from "./apply-facade-domain-patch";

const FIXTURE: FacadeMapModel = {
  version: 1,
  stage: "diagram_facades",
  revision: "facebase",
  updated: "2026-03-16T18:00:00Z",
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
  ],
  relations: [
    {
      id: "api-gateway__sync-call__auth-facade",
      from: "api-gateway",
      to: "auth-facade",
      type: "sync-call",
      origin: "agent",
      status: "proposed",
    },
  ],
};

test("applyFacadeDomainPatch adds a new facade with user provenance", () => {
  const result = applyFacadeDomainPatch(FIXTURE, {
    type: "add-facade",
    facade: {
      id: "billing-facade",
      module: "billing-service",
      kind: "class",
      visibility: "internal",
      methods: ["charge(invoiceId): Receipt"],
      ports: [{ direction: "Out", type: "event", target: "audit-log" }],
      contractTargets: ["contracts/billing-facade.md"],
      codeTargets: ["packages/billing-service/src/billing-facade.ts"],
    },
  });

  assert.equal(result.facades.length, 2);
  assert.deepEqual(result.facades[1], {
    id: "billing-facade",
    module: "billing-service",
    kind: "class",
    visibility: "internal",
    methods: ["charge(invoiceId): Receipt"],
    ports: [{ direction: "Out", type: "event", target: "audit-log" }],
    contractTargets: ["contracts/billing-facade.md"],
    codeTargets: ["packages/billing-service/src/billing-facade.ts"],
    origin: "user",
    status: "accepted",
    notes: undefined,
    rationale: undefined,
  });
  assert.notEqual(result.revision, FIXTURE.revision);
});

test("applyFacadeDomainPatch updates selected fields and normalizes empty notes", () => {
  const result = applyFacadeDomainPatch(FIXTURE, {
    type: "update-facade",
    facadeId: "auth-facade",
    changes: {
      visibility: "internal",
      methods: [
        "login(credentials): AuthToken",
        "logout(sessionId): void",
      ],
      notes: "   ",
      origin: "merged",
    },
  });

  assert.deepEqual(result.facades[0], {
    ...FIXTURE.facades[0],
    visibility: "internal",
    methods: ["login(credentials): AuthToken", "logout(sessionId): void"],
    origin: "merged",
    notes: undefined,
    rationale: undefined,
  });
});

test("applyFacadeDomainPatch deletes facade and linked relations", () => {
  const result = applyFacadeDomainPatch(FIXTURE, {
    type: "delete-facade",
    facadeId: "auth-facade",
  });

  assert.equal(result.facades.length, 0);
  assert.equal(result.relations.length, 0);
});
