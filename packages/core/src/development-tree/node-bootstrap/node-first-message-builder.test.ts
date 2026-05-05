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
const RUSSIAN_LOCALIZED_INSTRUCTION_PATTERN =
  /Локализованный пакет инструкций CodeAI Hub \(ru\):/;
const RUSSIAN_CONTRACT_ARTIFACT_PROSE_PATTERN =
  /Даже в `ModuleFacadeContract\.draft\.md` и `ClusterFacadeContract\.draft\.md` пояснительный текст внутри `<!-- agent-fill -->` должен быть на языке артефактов/;
const RUSSIAN_PROTECTED_TOKENS_PATTERN = /canonical tokens; не переводи их/;
const RUSSIAN_RESPONSE_LANGUAGE_PATTERN =
  /User communication language: ru \(from Settings > General > Reasoning\)\. Translate and communicate with the user in this language\./;
const RUSSIAN_ARTIFACT_LANGUAGE_PATTERN =
  /Target language code: ru \(from Settings > General > Artifacts for the User\)\./;
const DRAFT_ARTIFACT_LANGUAGE_RULE_PATTERN =
  /Write descriptive prose inside the draft artifacts in ru\./;
const CONTRACT_ARTIFACT_LOCALIZATION_PATTERN =
  /Contract artifacts are not an English-language exception/;
const FACADE_CONTRACT_PROSE_LOCALIZATION_PATTERN =
  /keep method\/event names and identifiers canonical, but write descriptions, boundary rationale, assumptions, and open questions in the target artifact language/;
const RUNTIME_TOOLING_FACTS_PATTERN = /Runtime tooling facts:/;
const PYTHON3_COMMAND_PATTERN = /Python command: `python3`\./;
const ARTIFACT_WRITE_ENCODING_PATTERN = /Artifact write encoding:/;
const UTF8_MARKDOWN_PATTERN = /Markdown draft artifacts as UTF-8 text/;
const CYRILLIC_DIRECT_UTF8_PATTERN =
  /Cyrillic and other localized prose must be written directly as valid UTF-8/;
const NO_ENCODING_RETRY_CHATTER_PATTERN =
  /Do not send user-facing progress updates about routine encoding retries/;
const ARTIFACT_EDIT_OPERATION_PATTERN = /Artifact edit operation:/;
const APPLY_PATCH_PATTERN = /use `apply_patch` when available/;
const NO_FALLBACK_SCRIPT_FIRST_PATTERN =
  /Do not choose fallback scripts as the first approach/;
const NO_PATCH_RETRY_CHATTER_PATTERN =
  /Do not send user-facing progress updates about patch mismatch, invisible blank lines/;
const ARTIFACT_CONTEXT_RULE_PATTERN =
  /Do not ask the user to re-explain information already present here\./;
const SCOPED_CONTEXT_HEADING_PATTERN =
  /Scoped workflow context \(read before asking the user\):/;
const FINAL_DESCRIPTION_HEADING_PATTERN = /### Final Description/;
const PROJECT_MANAGER_CONTEXT_PATTERN = /Project Manager coordinates sessions/;
const PRODUCT_PART_ARTIFACT_PATH_PATTERN =
  /\.codeai-hub\/demo\/diagram_modules\/product-parts\/project-manager\.md/;
const DRAFT_PASS_SOURCE_BOUNDARY_PATTERN =
  /For this automatic first draft pass, use only the scoped context included in this first prompt plus the listed target draft files\./;
const NO_OTHER_FILE_READS_PATTERN =
  /do not read, search, list, or open any other workspace files or documents\./;
const USER_PERMISSION_READS_PATTERN =
  /Additional file reading is allowed only after the user explicitly asks or permits you to read files in a later message\./;
const LEGACY_READ_REFERENCED_FILE_PATTERN = /read the referenced file/;
const LEGACY_READ_FULL_ARTIFACT_PATTERN = /read the file for the full artifact/;
const TRUNCATED_NO_READ_PATTERN =
  /Content excerpt: truncated; do not read the file during this automatic draft pass\./;
const OPEN_QUESTION_FOR_MISSING_CONTEXT_PATTERN =
  /capture any missing detail as an Open question/;

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
    artifactLanguage: "ru",
    node: createNode({ clusterId: "orchestration" }),
    responseLanguage: "ru",
    technologyBase: "TypeScript Node.js",
  });

  assert.deepEqual(result.draftFileNames, [
    "ModuleSpec.draft.md",
    "ModuleFacadeContract.draft.md",
  ]);
  assert.equal(result.requiresTechnologyBaseAnswer, false);
  assert.equal(
    result.content.startsWith(
      "Локализованный пакет инструкций CodeAI Hub (ru):"
    ),
    true
  );
  assert.match(result.content, RUSSIAN_LOCALIZED_INSTRUCTION_PATTERN);
  assert.match(result.content, RUSSIAN_CONTRACT_ARTIFACT_PROSE_PATTERN);
  assert.match(result.content, RUSSIAN_PROTECTED_TOKENS_PATTERN);
  assert.match(result.content, TYPESCRIPT_TECH_PATTERN);
  assert.match(result.content, RUSSIAN_RESPONSE_LANGUAGE_PATTERN);
  assert.match(result.content, RUSSIAN_ARTIFACT_LANGUAGE_PATTERN);
  assert.match(result.content, DRAFT_ARTIFACT_LANGUAGE_RULE_PATTERN);
  assert.match(result.content, CONTRACT_ARTIFACT_LOCALIZATION_PATTERN);
  assert.match(result.content, FACADE_CONTRACT_PROSE_LOCALIZATION_PATTERN);
  assert.match(result.content, RUNTIME_TOOLING_FACTS_PATTERN);
  assert.match(result.content, PYTHON3_COMMAND_PATTERN);
  assert.match(result.content, ARTIFACT_WRITE_ENCODING_PATTERN);
  assert.match(result.content, UTF8_MARKDOWN_PATTERN);
  assert.match(result.content, CYRILLIC_DIRECT_UTF8_PATTERN);
  assert.match(result.content, NO_ENCODING_RETRY_CHATTER_PATTERN);
  assert.match(result.content, ARTIFACT_EDIT_OPERATION_PATTERN);
  assert.match(result.content, APPLY_PATCH_PATTERN);
  assert.match(result.content, NO_FALLBACK_SCRIPT_FIRST_PATTERN);
  assert.match(result.content, NO_PATCH_RETRY_CHATTER_PATTERN);
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

test("NodeFirstMessageBuilder includes scoped workflow artifacts as prior context", () => {
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

  assert.match(result.content, SCOPED_CONTEXT_HEADING_PATTERN);
  assert.match(result.content, ARTIFACT_CONTEXT_RULE_PATTERN);
  assert.match(result.content, DRAFT_PASS_SOURCE_BOUNDARY_PATTERN);
  assert.match(result.content, NO_OTHER_FILE_READS_PATTERN);
  assert.match(result.content, USER_PERMISSION_READS_PATTERN);
  assert.match(result.content, FINAL_DESCRIPTION_HEADING_PATTERN);
  assert.match(result.content, PROJECT_MANAGER_CONTEXT_PATTERN);
  assert.match(result.content, PRODUCT_PART_ARTIFACT_PATH_PATTERN);
  assert.doesNotMatch(result.content, LEGACY_READ_REFERENCED_FILE_PATTERN);
  assert.doesNotMatch(result.content, LEGACY_READ_FULL_ARTIFACT_PATTERN);
});

test("NodeFirstMessageBuilder keeps truncated excerpts inside the no-read draft boundary", () => {
  const result = new NodeFirstMessageBuilder().build({
    artifactContext: [
      {
        content: "Partial upstream context.",
        label: "Virtual Simulation",
        relativePath:
          ".codeai-hub/demo/virtual_simulation/virtual-simulation.md",
        truncated: true,
      },
    ],
    node: createNode({ partId: "project-manager" }),
    technologyBase: "TypeScript",
  });

  assert.match(result.content, TRUNCATED_NO_READ_PATTERN);
  assert.match(result.content, OPEN_QUESTION_FOR_MISSING_CONTEXT_PATTERN);
  assert.match(result.content, USER_PERMISSION_READS_PATTERN);
});
