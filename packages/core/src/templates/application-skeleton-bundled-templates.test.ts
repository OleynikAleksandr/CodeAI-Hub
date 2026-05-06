import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { BUNDLED_TEMPLATE_SOURCES } from "./bundled-templates";

const PHASE_1_RE = /Phase 1: Draft Contract/;
const PHASE_2_RE = /Phase 2: Post-Acceptance Materialization/;
const BEFORE_ACCEPTANCE_RE = /Before explicit user acceptance/;
const NO_ROOT_FILES_RE = /must not:\n- create root workspace files/;
const MATERIALIZED_TRUE_RE = /materialized: true/;
const QUALITY_GATES_START_RE = /Quality Gates Baseline can start/;
const DO_NOT_START_WITH_STACK_QUESTIONS_RE =
  /Do not start by asking the user to choose language, framework, repo shape, or package manager/;
const RECOMMENDED_BASELINE_RE =
  /propose one recommended baseline when the inputs support a coherent default/;
const CONFIRMATION_STYLE_RE =
  /ask confirmation-style questions with your recommended option first/;
const PRODUCTION_SOURCE_ROOT_RE =
  /Never use `\.codeai-hub\/\.\.\.` workflow artifact folders as `sourceRoot`/;
const CLUSTERED_MODULE_PATH_RE = /clusters\/<cluster-id>\/modules\/<module-id>/;
const PRODUCT_PARTS_ROOT_RE = /product-parts\/<product-part-id>/;
const NO_CATEGORY_SPLIT_RE = /Do not split Product Part roots/;
const PRODUCT_PART_PACKAGE_MANIFEST_RE =
  /Product Part roots unless the accepted contract explicitly declares a Cluster or Module as a standalone package/;
const POST_MATERIALIZATION_RE =
  /remove or rewrite sections such as "will be created" or "after confirmation"/;
const ACCEPTED_FALSE_RE = /"accepted": false/;
const REVIEW_STATE_DRAFT_RE = /"reviewState": "draft"/;
const MATERIALIZED_FALSE_RE = /"materialized": false/;
const MATERIALIZATION_STATE_RE = /"materializationState": "not_started"/;
const MATERIALIZED_PATHS_RE = /"materializedPaths": \[\]/;
const ACCEPTED_AND_MATERIALIZED_RE = /accepted: true.*materialized: true/s;
const CODEAI_HUB_SOURCE_ROOT_RE =
  /sourceRoot` must point to the production source\/scaffold root and must not point under `\.codeai-hub\/`/;
const STANDALONE_MODULES_RE = /Standalone modules must use `standaloneModules`/;
const STACK_ARRAYS_RE =
  /`stack\.languages`, `stack\.frameworks`, and `stack\.runtimes` must be arrays/;

const decodeTemplate = (id: string): string => {
  const source = BUNDLED_TEMPLATE_SOURCES.find((item) => item.id === id);
  assert.ok(source, `missing bundled template ${id}`);
  return Buffer.from(source.base64, "base64").toString("utf8");
};

test("application skeleton bundled prompt requires draft and post-acceptance materialization phases", () => {
  const prompt = decodeTemplate("application-skeleton-prompt");

  assert.match(prompt, PHASE_1_RE);
  assert.match(prompt, PHASE_2_RE);
  assert.match(prompt, BEFORE_ACCEPTANCE_RE);
  assert.match(prompt, NO_ROOT_FILES_RE);
  assert.match(prompt, MATERIALIZED_TRUE_RE);
  assert.match(prompt, QUALITY_GATES_START_RE);
  assert.match(prompt, DO_NOT_START_WITH_STACK_QUESTIONS_RE);
  assert.match(prompt, RECOMMENDED_BASELINE_RE);
  assert.match(prompt, CONFIRMATION_STYLE_RE);
  assert.match(prompt, PRODUCTION_SOURCE_ROOT_RE);
  assert.match(prompt, CLUSTERED_MODULE_PATH_RE);
  assert.match(prompt, PRODUCT_PARTS_ROOT_RE);
  assert.match(prompt, NO_CATEGORY_SPLIT_RE);
  assert.match(prompt, PRODUCT_PART_PACKAGE_MANIFEST_RE);
  assert.match(prompt, POST_MATERIALIZATION_RE);
});

test("application skeleton bundled contract exposes materialization state fields", () => {
  const contract = decodeTemplate("application-skeleton-contract");

  assert.match(contract, ACCEPTED_FALSE_RE);
  assert.match(contract, REVIEW_STATE_DRAFT_RE);
  assert.match(contract, MATERIALIZED_FALSE_RE);
  assert.match(contract, MATERIALIZATION_STATE_RE);
  assert.match(contract, MATERIALIZED_PATHS_RE);
  assert.match(contract, ACCEPTED_AND_MATERIALIZED_RE);
  assert.match(contract, CODEAI_HUB_SOURCE_ROOT_RE);
  assert.match(contract, STANDALONE_MODULES_RE);
  assert.match(contract, STACK_ARRAYS_RE);
  assert.match(contract, PRODUCT_PARTS_ROOT_RE);
  assert.match(contract, NO_CATEGORY_SPLIT_RE);
});

test("application skeleton bundled templates stay synced with agent assets", async () => {
  const root = process.cwd();
  const promptAsset = await readFile(
    path.join(
      root,
      "packages/agents/application-skeleton-agent/assets/application-skeleton-prompt.md"
    ),
    "utf8"
  );
  const contractAsset = await readFile(
    path.join(
      root,
      "packages/agents/application-skeleton-agent/assets/application-skeleton-contract.md"
    ),
    "utf8"
  );

  assert.equal(decodeTemplate("application-skeleton-prompt"), promptAsset);
  assert.equal(decodeTemplate("application-skeleton-contract"), contractAsset);
});
