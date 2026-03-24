import assert from "node:assert/strict";
import test from "node:test";
import type { DiagramMapModel } from "./diagram-dsl-types";
import {
  computeDiagramRevision,
  materializeDiagramRevision,
} from "./diagram-revision";
import { parseModuleMapDsl } from "./markdown-dsl-parser";
import {
  serializeDiagramMapDsl,
  serializeModuleMapDsl,
} from "./markdown-dsl-serializer";

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

const parseDiagram = (content: string): DiagramMapModel => {
  const result = parseModuleMapDsl(content);
  if (!result.ok) {
    throw new Error("Expected fixture to parse");
  }
  return result.value;
};

const roundTripDiagram = (
  source: string,
  serializer: (model: DiagramMapModel) => string
): {
  readonly expected: string;
  readonly model: DiagramMapModel;
  readonly reparsed: DiagramMapModel;
  readonly revision: string;
  readonly serialized: string;
} => {
  const model = parseDiagram(source);
  const serialized = serializer(model);
  const revision = computeDiagramRevision(source);
  const expected = source.replace(
    "- Revision: deadbeef",
    `- Revision: ${revision}`
  );

  const reparsed = parseModuleMapDsl(serialized);
  if (!reparsed.ok) {
    throw new Error("Expected serialized output to parse");
  }

  return {
    expected,
    model,
    reparsed: reparsed.value,
    revision,
    serialized,
  };
};

test("serializeModuleMapDsl emits canonical markdown with computed revision", () => {
  const result = roundTripDiagram(MODULE_MAP_FIXTURE, (model) =>
    serializeModuleMapDsl(
      model as Extract<DiagramMapModel, { stage: "diagram_modules" }>
    )
  );

  assert.equal(result.serialized, result.expected);
  assert.equal(
    materializeDiagramRevision(MODULE_MAP_FIXTURE).revision,
    result.revision
  );
  assert.equal(
    result.reparsed.revision,
    computeDiagramRevision(result.serialized)
  );
  assert.deepEqual(result.reparsed, {
    ...result.model,
    revision: result.revision,
  });
});

test("serializeDiagramMapDsl routes by stage", () => {
  assert.equal(
    serializeDiagramMapDsl(parseDiagram(MODULE_MAP_FIXTURE)),
    MODULE_MAP_FIXTURE.replace(
      "- Revision: deadbeef",
      `- Revision: ${computeDiagramRevision(MODULE_MAP_FIXTURE)}`
    )
  );
});

test("serializeModuleMapDsl normalizes multiline CRLF text blocks", () => {
  const model = parseDiagram(MODULE_MAP_FIXTURE) as Extract<
    DiagramMapModel,
    { stage: "diagram_modules" }
  >;
  const serialized = serializeModuleMapDsl({
    ...model,
    modules: [
      {
        ...model.modules[0],
        notes: "Line one\r\nLine two",
        rationale: "Reason one\r\nReason two",
      },
      ...model.modules.slice(1),
    ],
  });

  assert.equal(serialized.includes("\r"), false);
  assert.equal(serialized.includes("Line one\nLine two"), true);
  assert.equal(serialized.includes("Reason one\nReason two"), true);
});
