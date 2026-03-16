import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFacadeMapChangeSummary,
  buildModuleMapChangeSummary,
} from "./baseline-diff-service";
import type { FacadeMapModel, ModuleMapModel } from "./diagram-dsl-types";

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

const FACADE_MAP_BASELINE: FacadeMapModel = {
  version: 1,
  stage: "diagram_facades",
  revision: "face1234",
  updated: "2026-03-16T15:00:00Z",
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
      notes: undefined,
      rationale: undefined,
    },
    {
      id: "legacy-facade",
      module: "legacy-adapter",
      kind: "class",
      visibility: "internal",
      methods: [],
      ports: [],
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
      id: "api-gateway__sync-call__auth-facade",
      from: "api-gateway",
      to: "auth-facade",
      type: "sync-call",
      label: "authenticate()",
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

test("buildFacadeMapChangeSummary tracks facade field-level changes", () => {
  const current: FacadeMapModel = {
    ...FACADE_MAP_BASELINE,
    revision: "face5678",
    facades: [
      {
        ...FACADE_MAP_BASELINE.facades[0],
        methods: ["login(credentials): AuthToken", "refresh(token): AuthToken"],
        ports: [
          { direction: "In", type: "http", target: "api-gateway" },
          { direction: "Out", type: "event", target: "audit-log" },
        ],
      },
      {
        id: "billing-facade",
        module: "billing-service",
        kind: "class",
        visibility: "internal",
        methods: ["createInvoice(input): Invoice"],
        ports: [{ direction: "In", type: "sync-call", target: "auth-facade" }],
        contractTargets: ["contracts/billing-facade.md"],
        codeTargets: ["packages/billing-service/src/billing-facade.ts"],
        origin: "user",
        status: "proposed",
        notes: undefined,
        rationale: undefined,
      },
    ],
    relations: [
      {
        ...FACADE_MAP_BASELINE.relations[0],
        label: "POST /login",
      },
      {
        id: "auth-facade__sync-call__billing-facade",
        from: "auth-facade",
        to: "billing-facade",
        type: "sync-call",
        label: "createInvoice()",
        origin: "user",
        status: "proposed",
        notes: undefined,
      },
    ],
  };

  const summary = buildFacadeMapChangeSummary(current, FACADE_MAP_BASELINE);

  assert.equal(summary.baselineRevision, "face1234");
  assert.equal(summary.currentRevision, "face5678");
  assert.deepEqual(
    buildFacadeMapChangeSummary(FACADE_MAP_BASELINE, null).changes.map(
      (change) => change.entityType
    ),
    ["facade", "facade", "facade-relation"]
  );
  assert.deepEqual(summary.changes, [
    {
      entityType: "facade",
      entityId: "auth-facade",
      action: "modified",
      modifiedFields: ["Methods", "Ports"],
      summary: "Facade: auth-facade — fields changed: Methods, Ports",
    },
    {
      entityType: "facade",
      entityId: "billing-facade",
      action: "added",
      summary:
        "Facade: billing-facade (Module: billing-service, Visibility: internal)",
    },
    {
      entityType: "facade",
      entityId: "legacy-facade",
      action: "removed",
      summary: "Facade: legacy-facade",
    },
    {
      entityType: "facade-relation",
      entityId: "api-gateway__sync-call__auth-facade",
      action: "modified",
      modifiedFields: ["Label"],
      summary:
        "Facade Relation: api-gateway__sync-call__auth-facade — fields changed: Label",
    },
    {
      entityType: "facade-relation",
      entityId: "auth-facade__sync-call__billing-facade",
      action: "added",
      summary: "Facade Relation: auth-facade__sync-call__billing-facade",
    },
  ]);
});

test("buildFacadeMapChangeSummary includes origin and status changes for merged facade handoff", () => {
  const current: FacadeMapModel = {
    ...FACADE_MAP_BASELINE,
    revision: "face9999",
    facades: [
      {
        ...FACADE_MAP_BASELINE.facades[0],
        origin: "merged",
        status: "accepted",
        notes: "User kept local edit after agent rerun.",
      },
      ...FACADE_MAP_BASELINE.facades.slice(1),
    ],
    relations: FACADE_MAP_BASELINE.relations,
  };

  const summary = buildFacadeMapChangeSummary(current, FACADE_MAP_BASELINE);

  assert.deepEqual(summary.changes, [
    {
      entityType: "facade",
      entityId: "auth-facade",
      action: "modified",
      modifiedFields: ["Origin", "Status", "Notes"],
      summary: "Facade: auth-facade — fields changed: Origin, Status, Notes",
    },
  ]);
});
