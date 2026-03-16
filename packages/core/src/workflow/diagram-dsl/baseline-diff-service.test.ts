import assert from "node:assert/strict";
import test from "node:test";
import { buildModuleMapChangeSummary } from "./baseline-diff-service";
import type { ModuleMapModel } from "./diagram-dsl-types";

const MODULE_MAP_BASELINE: ModuleMapModel = {
  version: 1,
  stage: "diagram_modules",
  revision: "base1234",
  updated: "2026-03-16T14:00:00Z",
  modules: [
    {
      id: "auth-service",
      kind: "service",
      title: "Authentication Service",
      responsibility: "Handle login and token validation",
      cluster: "security",
      inputs: ["user-credentials"],
      outputs: ["access-token"],
      specTarget: "specifications/auth-service-spec.md",
      contractTargets: ["contracts/auth-service-facade.md"],
      codeTargets: ["packages/auth-service/"],
      origin: "agent",
      status: "proposed",
      notes: "Primary authentication entry point.",
      rationale: undefined,
    },
    {
      id: "legacy-adapter",
      kind: "adapter",
      title: "Legacy Adapter",
      responsibility: "Bridge old API",
      inputs: [],
      outputs: [],
      contractTargets: [],
      codeTargets: [],
      origin: "agent",
      status: "accepted",
      notes: undefined,
      rationale: undefined,
    },
  ],
  relations: [
    {
      id: "api-gateway__sync-call__auth-service",
      from: "api-gateway",
      to: "auth-service",
      type: "sync-call",
      label: "authenticate()",
      criticality: "high",
      origin: "agent",
      status: "proposed",
      notes: undefined,
    },
  ],
};

test("buildModuleMapChangeSummary marks all entities as added when baseline is missing", () => {
  const summary = buildModuleMapChangeSummary(MODULE_MAP_BASELINE, null);

  assert.equal(summary.baselineRevision, "missing-baseline");
  assert.equal(summary.currentRevision, "base1234");
  assert.deepEqual(
    summary.changes.map((change) => change.action),
    ["added", "added", "added"]
  );
});

test("buildModuleMapChangeSummary tracks module and relation additions removals and modifications", () => {
  const current: ModuleMapModel = {
    ...MODULE_MAP_BASELINE,
    revision: "curr5678",
    modules: [
      {
        ...MODULE_MAP_BASELINE.modules[0],
        title: "Auth Service",
        responsibility: "Handle login, refresh, and token validation",
      },
      {
        id: "notification-service",
        kind: "service",
        title: "Notification Service",
        responsibility: "Deliver outbound notifications",
        inputs: ["notification-event"],
        outputs: ["delivery-status"],
        contractTargets: [],
        codeTargets: ["packages/notification-service/"],
        origin: "user",
        status: "proposed",
        notes: undefined,
        rationale: undefined,
      },
    ],
    relations: [
      {
        ...MODULE_MAP_BASELINE.relations[0],
        label: "POST /login",
      },
      {
        id: "auth-service__async-event__notification-service",
        from: "auth-service",
        to: "notification-service",
        type: "async-event",
        label: "UserSignedIn",
        criticality: "medium",
        origin: "user",
        status: "proposed",
        notes: undefined,
      },
    ],
  };

  const summary = buildModuleMapChangeSummary(current, MODULE_MAP_BASELINE);

  assert.equal(summary.baselineRevision, "base1234");
  assert.equal(summary.currentRevision, "curr5678");
  assert.deepEqual(summary.changes, [
    {
      entityType: "module",
      entityId: "auth-service",
      action: "modified",
      modifiedFields: ["Title", "Responsibility"],
      summary: "Module: auth-service — fields changed: Title, Responsibility",
    },
    {
      entityType: "module",
      entityId: "notification-service",
      action: "added",
      summary:
        "Module: notification-service (Kind: service, Title: Notification Service)",
    },
    {
      entityType: "module",
      entityId: "legacy-adapter",
      action: "removed",
      summary: "Module: legacy-adapter",
    },
    {
      entityType: "relation",
      entityId: "api-gateway__sync-call__auth-service",
      action: "modified",
      modifiedFields: ["Label"],
      summary:
        "Relation: api-gateway__sync-call__auth-service — fields changed: Label",
    },
    {
      entityType: "relation",
      entityId: "auth-service__async-event__notification-service",
      action: "added",
      summary: "Relation: auth-service__async-event__notification-service",
    },
  ]);
});
