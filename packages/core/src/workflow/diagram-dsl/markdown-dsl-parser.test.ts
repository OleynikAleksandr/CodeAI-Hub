import assert from "node:assert/strict";
import test from "node:test";
import type { MarkdownDslParseWarning } from "./diagram-dsl-types";
import {
  computeDiagramRevision,
  parseModuleMapDsl,
} from "./markdown-dsl-parser";

const DUPLICATE_ID_RE = /auth-service/;
const RESPONSIBILITY_RE = /Responsibility/;
const METADATA_SECTION_RE = /## Metadata[\s\S]*?## Modules/;

const MODULE_MAP_FIXTURE = `# Module Map

## Metadata
- Version: 1
- Stage: diagram_modules
- Revision: deadbeef
- Updated: 2026-03-16T14:00:00Z

## Modules

### Module: auth-service
- Id: auth-service
- Kind: service
- Title: Authentication Service
- Responsibility: Handle login and token validation
- Cluster: security
- Inputs:
  - user-credentials
  - refresh-token
- Outputs:
  - access-token
- Spec Target: specifications/auth-service-spec.md
- Contract Targets:
  - contracts/auth-service-facade.md
- Code Targets:
  - packages/auth-service/
- Origin: agent
- Status: proposed

Notes:
Primary authentication entry point.

### Module: user-store
- Id: user-store
- Kind: store
- Title: User Store
- Responsibility: CRUD for users
- Inputs:
  - user-data
- Outputs:
  - user-record
- Origin: user
- Status: accepted

Rationale:
Kept as a dedicated persistence boundary.

## Relations

### Relation: auth-service__sync-call__user-store
- Id: auth-service__sync-call__user-store
- From: auth-service
- To: user-store
- Type: sync-call
- Label: findUser()
- Criticality: high
- Origin: agent
- Status: proposed

Notes:
Reads current user profile.`;

test("parseModuleMapDsl parses canonical module map and computes revision", () => {
  const result = parseModuleMapDsl(MODULE_MAP_FIXTURE);

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.version, 1);
  assert.equal(result.value.stage, "diagram_modules");
  assert.equal(
    result.value.revision,
    computeDiagramRevision(MODULE_MAP_FIXTURE)
  );
  assert.equal(result.value.modules.length, 2);
  assert.equal(result.value.relations.length, 1);
  assert.deepEqual(result.value.modules[0], {
    id: "auth-service",
    kind: "service",
    title: "Authentication Service",
    responsibility: "Handle login and token validation",
    cluster: "security",
    inputs: ["user-credentials", "refresh-token"],
    outputs: ["access-token"],
    specTarget: "specifications/auth-service-spec.md",
    contractTargets: ["contracts/auth-service-facade.md"],
    codeTargets: ["packages/auth-service/"],
    origin: "agent",
    status: "proposed",
    notes: "Primary authentication entry point.",
    rationale: undefined,
  });
  assert.deepEqual(result.value.modules[1], {
    id: "user-store",
    kind: "store",
    title: "User Store",
    responsibility: "CRUD for users",
    cluster: undefined,
    inputs: ["user-data"],
    outputs: ["user-record"],
    specTarget: undefined,
    contractTargets: [],
    codeTargets: [],
    origin: "user",
    status: "accepted",
    notes: undefined,
    rationale: "Kept as a dedicated persistence boundary.",
  });
  assert.deepEqual(result.value.relations[0], {
    id: "auth-service__sync-call__user-store",
    from: "auth-service",
    to: "user-store",
    type: "sync-call",
    label: "findUser()",
    criticality: "high",
    origin: "agent",
    status: "proposed",
    notes: "Reads current user profile.",
  });
  assert.deepEqual(result.warnings, []);
});

test("parseModuleMapDsl ignores unknown sections and keeps parsing", () => {
  const result = parseModuleMapDsl(`${MODULE_MAP_FIXTURE}

## Appendix
Free-form notes that should be ignored.`);

  assert.equal(result.ok, true);
  assert.equal(
    result.warnings.some(
      (warning: MarkdownDslParseWarning) => warning.code === "unknown-section"
    ),
    true
  );
});

test("parseModuleMapDsl fails on duplicate module ids", () => {
  const duplicateFixture = MODULE_MAP_FIXTURE.replace(
    "### Module: user-store",
    "### Module: auth-service"
  ).replace("- Id: user-store", "- Id: auth-service");
  const result = parseModuleMapDsl(duplicateFixture);

  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }

  assert.equal(result.error.code, "duplicate-entity-id");
  assert.match(result.error.message, DUPLICATE_ID_RE);
});

test("parseModuleMapDsl fails on missing required module field", () => {
  const invalidFixture = MODULE_MAP_FIXTURE.replace(
    "- Responsibility: Handle login and token validation\n",
    ""
  );
  const result = parseModuleMapDsl(invalidFixture);

  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }

  assert.equal(result.error.code, "missing-required-field");
  assert.match(result.error.message, RESPONSIBILITY_RE);
});

test("parseModuleMapDsl fails when metadata section is missing", () => {
  const invalidFixture = MODULE_MAP_FIXTURE.replace(
    METADATA_SECTION_RE,
    "## Modules"
  );
  const result = parseModuleMapDsl(invalidFixture);

  assert.equal(result.ok, false);
  if (result.ok) {
    return;
  }

  assert.equal(result.error.code, "missing-section");
});
