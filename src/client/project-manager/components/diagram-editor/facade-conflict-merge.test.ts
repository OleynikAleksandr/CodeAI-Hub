import assert from "node:assert/strict";
import test from "node:test";
import type { FacadeMapModel } from "../../../../../packages/core/src/workflow/diagram-dsl/diagram-dsl-types";
import { mergeFacadeConflicts } from "./facade-conflict-merge";

const FIXTURE: FacadeMapModel = {
  version: 1,
  stage: "diagram_facades",
  revision: "facemerge",
  updated: "2026-03-16T19:00:00Z",
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
  relations: [],
};

test("mergeFacadeConflicts replays local facade edits over incoming model", () => {
  const result = mergeFacadeConflicts({
    incoming: FIXTURE,
    patches: [
      {
        type: "add-facade",
        facade: {
          id: "billing-facade",
          module: "billing-service",
          kind: "class",
          visibility: "internal",
          methods: ["charge(invoiceId): Receipt"],
          ports: [],
          contractTargets: ["contracts/billing-facade.md"],
          codeTargets: ["packages/billing-service/src/billing-facade.ts"],
        },
      },
      {
        type: "add-facade-relation",
        relation: {
          id: "auth-facade__sync-call__billing-facade",
          from: "auth-facade",
          to: "billing-facade",
          type: "sync-call",
        },
      },
    ],
  });

  assert.equal(result.conflicts.length, 0);
  assert.equal(result.model.facades.length, 2);
  assert.equal(result.model.relations.length, 1);
});

test("mergeFacadeConflicts collects replay errors and preserved edit summary", () => {
  const result = mergeFacadeConflicts({
    incoming: FIXTURE,
    patches: [
      {
        type: "add-facade-relation",
        relation: {
          id: "unknown__sync-call__auth-facade",
          from: "unknown-endpoint",
          to: "auth-facade",
          type: "sync-call",
        },
      },
      {
        type: "update-facade",
        facadeId: "auth-facade",
        changes: {
          visibility: "internal",
          origin: "merged",
        },
      },
    ],
  });

  assert.equal(result.conflicts.some((message) => message.includes("unknown-endpoint")), true);
  assert.equal(
    result.conflicts.some((message) => message.includes("Preserved local edit: Facade: auth-facade")),
    true
  );
});

test("mergeFacadeConflicts reapplies local facade edits over incoming agent refresh", () => {
  const incoming: FacadeMapModel = {
    ...FIXTURE,
    revision: "facemerge-next",
    facades: [
      {
        ...FIXTURE.facades[0],
        methods: [
          "login(credentials): AuthToken",
          "refresh(token): AuthToken",
        ],
        notes: "Agent refreshed the facade surface.",
      },
    ],
  };

  const result = mergeFacadeConflicts({
    incoming,
    patches: [
      {
        type: "update-facade",
        facadeId: "auth-facade",
        changes: {
          visibility: "internal",
          origin: "merged",
        },
      },
      {
        type: "add-facade-relation",
        relation: {
          id: "auth-facade__async-event__auth-service",
          from: "auth-facade",
          to: "auth-service",
          type: "async-event",
        },
      },
    ],
  });

  assert.equal(result.conflicts.length, 0);
  assert.deepEqual(result.model.facades[0], {
    ...incoming.facades[0],
    visibility: "internal",
    origin: "merged",
    rationale: undefined,
  });
  assert.deepEqual(result.model.relations[0], {
    id: "auth-facade__async-event__auth-service",
    from: "auth-facade",
    to: "auth-service",
    type: "async-event",
    label: undefined,
    notes: undefined,
    origin: "user",
    status: "accepted",
  });
});
