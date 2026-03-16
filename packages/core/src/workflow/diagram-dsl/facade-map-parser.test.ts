import assert from "node:assert/strict";
import test from "node:test";
import type { MarkdownDslParseWarning } from "./diagram-dsl-types";
import {
  computeDiagramRevision,
  parseFacadeMapDsl,
} from "./markdown-dsl-parser";

const DUPLICATE_FACADE_ID_RE = /auth-facade/;
const MODULE_FIELD_RE = /Module/;

const FACADE_MAP_FIXTURE = `# Facade Map

## Metadata
- Version: 1
- Stage: diagram_facades
- Revision: deadbeef
- Updated: 2026-03-16T15:00:00Z

## Facades

### Facade: auth-facade
- Id: auth-facade
- Module: auth-service
- Kind: class
- Visibility: public
- Methods:
  - login(credentials): AuthToken
  - logout(sessionId): void
- Ports:
  - In: http from api-gateway
  - Out: event to audit-log
- Contract Targets:
  - contracts/auth-facade.md
- Code Targets:
  - packages/auth-service/src/auth-facade.ts
- Origin: agent
- Status: proposed

## Facade Relations

### Facade Relation: api-gateway__sync-call__auth-facade
- Id: api-gateway__sync-call__auth-facade
- From: api-gateway
- To: auth-facade
- Type: sync-call
- Label: POST /login
- Origin: user
- Status: accepted`;

const FACADE_BLOCK_FIXTURE = `### Facade: auth-facade
- Id: auth-facade
- Module: auth-service
- Kind: class
- Visibility: public
- Methods:
  - login(credentials): AuthToken
  - logout(sessionId): void
- Ports:
  - In: http from api-gateway
  - Out: event to audit-log
- Contract Targets:
  - contracts/auth-facade.md
- Code Targets:
  - packages/auth-service/src/auth-facade.ts
- Origin: agent
- Status: proposed`;

test("parseFacadeMapDsl parses canonical facade map", () => {
  const result = parseFacadeMapDsl(FACADE_MAP_FIXTURE);

  assert.equal(result.ok, true);
  if (!result.ok || result.value.stage !== "diagram_facades") {
    return;
  }

  assert.equal(
    result.value.revision,
    computeDiagramRevision(FACADE_MAP_FIXTURE)
  );
  assert.deepEqual(result.value.facades[0], {
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
    notes: undefined,
    rationale: undefined,
  });
});

test("parseFacadeMapDsl warns on unknown entity header and fails on duplicate ids", () => {
  const warned = parseFacadeMapDsl(`${FACADE_MAP_FIXTURE}

### Widget: unknown
- Id: unknown`);
  assert.equal(warned.ok, true);
  assert.equal(
    warned.warnings.some(
      (warning: MarkdownDslParseWarning) =>
        warning.code === "unknown-entity-header"
    ),
    true
  );

  const duplicate = parseFacadeMapDsl(
    FACADE_MAP_FIXTURE.replace(
      FACADE_BLOCK_FIXTURE,
      `${FACADE_BLOCK_FIXTURE}

### Facade: auth-facade
- Id: auth-facade
- Module: billing-service
- Kind: class
- Visibility: public
- Methods:
  - login(credentials): AuthToken
- Ports:
  - In: http from api-gateway
- Contract Targets:
  - contracts/billing-facade.md
- Code Targets:
  - packages/billing-service/src/auth-facade.ts
- Origin: agent
- Status: proposed`
    )
  );
  assert.equal(duplicate.ok, false);
  if (duplicate.ok) {
    return;
  }
  assert.equal(duplicate.error.code, "duplicate-entity-id");
  assert.match(duplicate.error.message, DUPLICATE_FACADE_ID_RE);
});

test("parseFacadeMapDsl fails on missing required facade field", () => {
  const invalidFixture = FACADE_MAP_FIXTURE.replace(
    "- Module: auth-service\n",
    ""
  );
  const result = parseFacadeMapDsl(invalidFixture);

  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }
  assert.equal(result.error.code, "missing-required-field");
  assert.match(result.error.message, MODULE_FIELD_RE);
});
