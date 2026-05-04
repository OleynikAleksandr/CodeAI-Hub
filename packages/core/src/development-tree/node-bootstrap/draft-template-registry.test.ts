import assert from "node:assert/strict";
import test from "node:test";
import type { DevelopmentTreeDetectedNode } from "./development-tree-node-detector";
import { DraftFrontmatterBuilder } from "./draft-frontmatter-builder";
import { DraftTemplateRegistry } from "./draft-template-registry";

const FRONTMATTER_HEADER_PATTERN = /^---\nstatus: draft\n/;
const DERIVED_HASH_PATTERN = /derivedHash: "sha256:abc123"\n/;
const GENERATED_AT_PATTERN = /generatedAt: "2026-05-04T10:00:00.000Z"\n/;
const AGENT_TOUCHED_PATTERN = /agentTouched: false\n/;
const OUTDATED_PATTERN = /outdated: false\n/;
const ORPHANED_PATTERN = /orphaned: false\n---\n$/;
const MODULE_SPEC_TITLE_PATTERN = /# ModuleSpec\n/;
const MODULE_SPEC_IMPLEMENTS_PATTERN =
  /## Implements\n- ModuleFacadeContract\.draft\.md/;
const IO_FIELD_PATTERN = /\bInputs?\b|\bOutputs?\b/;
const EXPOSED_METHODS_PATTERN = /## Methods\/Events exposed\n/;
const CONSUMED_METHODS_PATTERN = /## Methods\/Events consumed\n/;
const GENERATED_ZONE_PATTERN = /<!-- generated -->[\s\S]*<!-- \/generated -->/;
const EMPTY_RESPONSIBILITY_PATTERN =
  /## Responsibility\n<!-- agent-fill -->\n\n<!-- \/agent-fill -->/;

const createNode = (
  overrides: Partial<DevelopmentTreeDetectedNode>
): DevelopmentTreeDetectedNode => ({
  absolutePath:
    "/workspace/.codeai-hub/demo/development_tree/materialized/product-parts/local-runtime/modules/provider-bridge",
  id: "provider-bridge",
  kind: "module",
  partId: "local-runtime",
  relativePath:
    ".codeai-hub/demo/development_tree/materialized/product-parts/local-runtime/modules/provider-bridge",
  ...overrides,
});

test("DraftFrontmatterBuilder creates stable draft metadata", () => {
  const frontmatter = new DraftFrontmatterBuilder().build({
    derivedHash: "sha256:abc123",
    generatedAt: "2026-05-04T10:00:00.000Z",
    node: createNode({}),
  });

  assert.match(frontmatter, FRONTMATTER_HEADER_PATTERN);
  assert.match(frontmatter, DERIVED_HASH_PATTERN);
  assert.match(frontmatter, GENERATED_AT_PATTERN);
  assert.match(frontmatter, AGENT_TOUCHED_PATTERN);
  assert.match(frontmatter, OUTDATED_PATTERN);
  assert.match(frontmatter, ORPHANED_PATTERN);
});

test("DraftTemplateRegistry selects structural draft files by node kind", () => {
  const registry = new DraftTemplateRegistry();

  assert.deepEqual(
    registry
      .getTemplatesForNode(
        createNode({ kind: "product_part", id: "local-runtime" })
      )
      .map((template) => template.fileName),
    ["PartDescription.draft.md"]
  );
  assert.deepEqual(
    registry
      .getTemplatesForNode(
        createNode({
          clusterId: "orchestration",
          id: "orchestration",
          kind: "cluster",
        })
      )
      .map((template) => template.fileName),
    ["ClusterDescription.draft.md", "ClusterFacadeContract.draft.md"]
  );
  assert.deepEqual(
    registry
      .getTemplatesForNode(createNode({}))
      .map((template) => template.fileName),
    ["ModuleSpec.draft.md", "ModuleFacadeContract.draft.md"]
  );
});

test("DraftTemplateRegistry renders module spec without contract IO fields", () => {
  const rendered = new DraftTemplateRegistry().renderDrafts({
    derivedHash: "sha256:def456",
    generatedAt: new Date("2026-05-04T11:00:00.000Z"),
    node: createNode({ clusterId: "orchestration" }),
  });

  const spec = rendered.find(
    (draft) => draft.fileName === "ModuleSpec.draft.md"
  );
  const contract = rendered.find(
    (draft) => draft.fileName === "ModuleFacadeContract.draft.md"
  );

  assert.ok(spec);
  assert.ok(contract);
  assert.match(spec.content, MODULE_SPEC_TITLE_PATTERN);
  assert.match(spec.content, MODULE_SPEC_IMPLEMENTS_PATTERN);
  assert.doesNotMatch(spec.content, IO_FIELD_PATTERN);
  assert.match(contract.content, EXPOSED_METHODS_PATTERN);
  assert.match(contract.content, CONSUMED_METHODS_PATTERN);
});

test("DraftTemplateRegistry keeps generated and agent-fill zones separate", () => {
  const [draft] = new DraftTemplateRegistry().renderDrafts({
    derivedHash: "sha256:part789",
    generatedAt: "2026-05-04T12:00:00.000Z",
    node: createNode({ kind: "product_part", id: "local-runtime" }),
  });

  assert.ok(draft);
  assert.match(draft.content, GENERATED_ZONE_PATTERN);
  assert.match(draft.content, EMPTY_RESPONSIBILITY_PATTERN);
});
