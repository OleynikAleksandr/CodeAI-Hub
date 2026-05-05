import assert from "node:assert/strict";
import test from "node:test";
import type { DevelopmentTreeDetectedNode } from "./development-tree-node-detector";
import { NodeFirstMessageBuilder } from "./node-first-message-builder";

const GENERATED_RULE_PATTERN =
  /Do not edit content inside <!-- generated --> blocks\./;
const AGENT_FILL_RULE_PATTERN =
  /Write only inside <!-- agent-fill --> blocks\./;
const TECH_QUESTION_PATTERN =
  /Technology base: unknown\. Ask the user to confirm the stack/;
const TYPESCRIPT_TECH_PATTERN = /Technology base: TypeScript Node\.js/;
const MODULE_SPEC_BOUNDARY_PATTERN =
  /Do not add Inputs\/Outputs sections to ModuleSpec\.draft\.md\./;
const RUSSIAN_RESPONSE_LANGUAGE_PATTERN =
  /User communication language: ru \(from Settings > General > Reasoning\)\. Translate and communicate with the user in this language\./;
const ARTIFACT_CONTEXT_RULE_PATTERN =
  /Do not ask the user to re-explain information already present here\./;
const FINAL_DESCRIPTION_HEADING_PATTERN = /### Final Description/;
const PROJECT_MANAGER_CONTEXT_PATTERN = /Project Manager coordinates sessions/;
const PRODUCT_PART_ARTIFACT_PATH_PATTERN =
  /\.codeai-hub\/demo\/diagram_modules\/product-parts\/project-manager\.md/;

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

test("NodeFirstMessageBuilder asks for technology base when it is unknown", () => {
  const result = new NodeFirstMessageBuilder().build({
    node: createNode({}),
  });

  assert.equal(result.requiresTechnologyBaseAnswer, true);
  assert.match(result.content, TECH_QUESTION_PATTERN);
  assert.match(result.content, GENERATED_RULE_PATTERN);
  assert.match(result.content, AGENT_FILL_RULE_PATTERN);
});

test("NodeFirstMessageBuilder includes module drafts and contract boundaries", () => {
  const result = new NodeFirstMessageBuilder().build({
    node: createNode({ clusterId: "orchestration" }),
    responseLanguage: "ru",
    technologyBase: "TypeScript Node.js",
  });

  assert.deepEqual(result.draftFileNames, [
    "ModuleSpec.draft.md",
    "ModuleFacadeContract.draft.md",
  ]);
  assert.equal(result.requiresTechnologyBaseAnswer, false);
  assert.match(result.content, TYPESCRIPT_TECH_PATTERN);
  assert.match(result.content, RUSSIAN_RESPONSE_LANGUAGE_PATTERN);
  assert.match(result.content, MODULE_SPEC_BOUNDARY_PATTERN);
});

test("NodeFirstMessageBuilder maps product part and cluster draft files", () => {
  const builder = new NodeFirstMessageBuilder();
  const productPart = builder.build({
    node: createNode({ id: "local-runtime", kind: "product_part" }),
    technologyBase: "TypeScript",
  });
  const cluster = builder.build({
    node: createNode({
      clusterId: "orchestration",
      id: "orchestration",
      kind: "cluster",
    }),
    technologyBase: "TypeScript",
  });

  assert.deepEqual(productPart.draftFileNames, ["PartDescription.draft.md"]);
  assert.deepEqual(cluster.draftFileNames, [
    "ClusterDescription.draft.md",
    "ClusterFacadeContract.draft.md",
  ]);
});

test("NodeFirstMessageBuilder includes existing workflow artifacts as prior context", () => {
  const result = new NodeFirstMessageBuilder().build({
    artifactContext: [
      {
        content:
          "Project Manager coordinates sessions, artifacts, and workflow state.",
        label: "Final Description",
        relativePath: ".codeai-hub/demo/description/Final_Description.md",
        truncated: false,
      },
      {
        content: "Product Part: Project Manager\nCluster: workflow-artifact-ui",
        label: "Diagram Modules Product Part: project-manager",
        relativePath:
          ".codeai-hub/demo/diagram_modules/product-parts/project-manager.md",
        truncated: false,
      },
    ],
    node: createNode({ partId: "project-manager" }),
    technologyBase: "TypeScript",
  });

  assert.match(result.content, ARTIFACT_CONTEXT_RULE_PATTERN);
  assert.match(result.content, FINAL_DESCRIPTION_HEADING_PATTERN);
  assert.match(result.content, PROJECT_MANAGER_CONTEXT_PATTERN);
  assert.match(result.content, PRODUCT_PART_ARTIFACT_PATH_PATTERN);
});
