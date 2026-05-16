import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { BUNDLED_TEMPLATE_SOURCES } from "./bundled-templates";

const PHASE_1_RE = /Phase 1: Draft Contract/;
const PHASE_2_RE = /Phase 2: Post-Acceptance Materialization/;
const BEFORE_ACCEPTANCE_RE = /Before explicit user acceptance/;
const NO_PRODUCTION_FILES_RE = /Do not create production files/;
const MATERIALIZED_TRUE_RE = /materialized: true/;
const QUALITY_GATES_START_RE = /ready for Quality Gates Baseline/;
const INSTALLABLE_FOUNDATION_RE =
  /complete installable and buildable project foundation/;
const NO_QUALITY_GATE_PRODUCTS_RE =
  /(?:Do not choose or integrate quality-gate products|quality-gate product selection or integration)/;
const NO_MATERIALIZE_WITH_OPEN_QUESTIONS_RE =
  /no permission to materialize while any decision remains in `openQuestions`/;
const PROJECT_FOUNDATION_JSON_RE = /"projectFoundation": \{/;
const OPEN_QUESTIONS_JSON_RE = /"openQuestions": \[\]/;
const NODE_MODULES_NOT_COMMITTED_RE =
  /`node_modules` and other (?:dependency )?install outputs? must not be (?:committed|listed as materialized output)/;
const REAL_TARGETS_RE = /real config(?:\/| and )source targets/;
const REWRITE_BOUNDARY_RE = /Rewrite Boundary/;
const RUNTIME_CONTEXT_OWNER_RE =
  /The runtime provides the current target, upstream evidence, and validation context/;
const EMBEDDED_PLAN_CONTEXT_RE =
  /use only the workspace context, target artifact, and validation instructions embedded in the current runtime prompt/;
const APPLICATION_SKELETON_HANDOFF_RE =
  /runtime prompt must explicitly identify the Application Skeleton stage and target artifact/;
const CANONICAL_DRAFT_TEMPLATE_RE =
  /Keep these headings exactly in English because Core validation treats them as canonical structural tokens/;
const REQUIRED_MARKDOWN_HEADINGS_RE =
  /# Application Skeleton[\s\S]*## Overview[\s\S]*## Architecture[\s\S]*## Stack[\s\S]*## Product Parts[\s\S]*## Filesystem[\s\S]*## Materialization[\s\S]*## Assumptions/;
const DRAFT_JSON_LIFECYCLE_RE =
  /"reviewState": "draft"[\s\S]*"accepted": false[\s\S]*"materialized": false[\s\S]*"materializationState": "not_started"/;
const NO_LIFECYCLE_REPAIR_RE =
  /Do not create, reinstall, repair, rename, restore, revert, checkout, or replace git, hooks, plan scripts/;
const NO_ROOT_TODO_RE = /doc\/TODO\/todo-plan\.md/;
const WORKSPACE_PLAN_PATH_RE = /doc\/TODO\/workspace\.plan\.md/;
const PLAN_STATUS_COMMAND_RE = /npm run plan:status/;
const NO_AD_HOC_DIAGNOSTICS_RE =
  /Do not run Python, Node, jq, git, plan, or other ad hoc diagnostic commands/;
const CODE_WRITING_WORKSPACE_RE =
  /prepare the workspace for real code writing/u;
const DEVELOPMENT_TREE_MIRROR_RE =
  /mirrors the Project Manager Development Tree exactly/u;
const CONCRETE_FRAMEWORK_BASELINE_RE =
  /propose concrete framework\/runtime baselines/u;
const MARKDOWN_IS_DECISION_ARTIFACT_RE =
  /The Markdown artifact is for the proposed and agreed project foundation/;
const QUESTIONS_ONLY_IN_DIALOGUE_RE =
  /All clarification, questions, and discussion happen only in dialogue/;
const NO_MARKDOWN_QUESTIONNAIRE_RE =
  /Do not turn `application-skeleton\.md` into a questionnaire/;
const RECOMMENDED_BASELINE_RE =
  /Use upstream facts to propose a recommended baseline/;
const TECHNOLOGY_HINTS_RE =
  /Treat explicit upstream technology hints, such as a named shell, launcher, runtime, framework, package format, client surface, desktop shell, webview, UI, frontend, API server, or deployment target, as strong baseline evidence/;
const CONFIRMATION_STYLE_RE =
  /confirmation question with the recommended option first/;
const LOCALIZED_DRAFT_RESPONSE_RE =
  /tell the user, in the chat language, that the draft Application Skeleton contract is ready for review/;
const EXACT_REVIEW_CLOSING_PHRASE_RE =
  /Пожалуйста, подтвердите контракт или перечислите правки, которые нужно внести перед интеграцией\./;
const LOCALIZED_MATERIALIZED_RESPONSE_RE =
  /tell the user, in the chat language, that Application Skeleton is accepted and materialized/;
const RUNTIME_REVIEW_READY_RE = /ready for runtime\/user review/;
const PLAN_COMMIT_RE = /npm run plan:commit/;
const PROVIDER_STAGE_ONLY_RE = /stage only the two canonical/u;
const BEFORE_COMMITTING_RE = /Before committing materialization/u;
const THEN_COMMIT_RE = /then commit/u;
const PARTIAL_COMMIT_RE = /commit a partial result/u;
const DRAFT_REVISION_MICROTASK_RE =
  /Do not edit plan files or create lifecycle tasks yourself/;
const MATERIALIZATION_CONTEXT_RE =
  /runtime-provided context is still for the Application Skeleton materialization task/;
const USER_STACK_REPLACEMENT_RE =
  /If the user explicitly replaces a stack decision/;
const NO_STACK_DETAIL_LOOP_RE =
  /do not open a new question loop about how to apply that chosen baseline/;
const PRODUCTION_SOURCE_ROOT_RE =
  /Never use `\.codeai-hub\/\.\.\.` as `sourceRoot` or production `codePath`/;
const WORKSPACE_ROOT_CURRENT_DIRECTORY_RE =
  /workspace root is the provider process current working directory \/ repository root/;
const WORKSPACE_ROOT_JSON_RE = /workspaceRoot: "\."/;
const NO_CODEAI_HUB_PRODUCTION_ROOT_RE =
  /Never create production scaffold, Product Part roots, package manifests, or `materializedPaths` under `\.codeai-hub\/<workspaceSlug>\/\.\.\.`/;
const CLUSTERED_MODULE_PATH_RE = /clusters\/<cluster-id>\/modules\/<module-id>/;
const PRODUCT_PARTS_ROOT_RE = /product-parts\/<product-part-id>/;
const SOURCE_ROOT_PRODUCT_PARTS_RE = /sourceRoot: "product-parts"/;
const NO_CATEGORY_SPLIT_RE = /Do not split Product Part roots/;
const PRODUCT_PART_PACKAGE_MANIFEST_RE =
  /Product Part roots unless the accepted contract explicitly declares a Cluster or Module as a standalone package/;
const POST_MATERIALIZATION_RE =
  /remove stale draft\/future claims from both artifacts/;
const STALE_DEFERRED_NOTE_RE =
  /deferred note that says the filesystem was not materialized/;
const CANONICAL_ID_RE =
  /stable canonical `id` values.*legacy aliases `partId`, `clusterId`, and `moduleId` are optional/s;
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
const CONTRACT_TECHNOLOGY_HINTS_RE =
  /Explicit upstream technology hints, such as named shell, launcher, runtime, framework, package format, or deployment target, must be treated as strong baseline evidence/;
const CONTRACT_CORE_LIFECYCLE_OWNER_RE =
  /Git, hooks, workspace plan state, active stage todo-plan state.*are not skeleton materialization output/;
const CONTRACT_CODE_READY_RE = /code-ready installable project foundation/u;
const CONTRACT_FRAMEWORK_SURFACES_RE =
  /visible implementation surfaces such as Project Manager, launcher, desktop shell, webview, frontend/u;
const CONTRACT_DEVELOPMENT_TREE_MIRROR_RE =
  /filesystem must mirror the Project Manager Development Tree/u;
const CONTRACT_MARKDOWN_DECISION_ARTIFACT_RE =
  /Markdown records the proposed and agreed project foundation/;
const CONTRACT_QUESTIONS_IN_DIALOGUE_RE =
  /Any non-empty entry blocks materialization and must be asked to the user in dialogue/;
const CONTRACT_NO_QUESTIONNAIRE_RE =
  /application-skeleton\.md` must not become a questionnaire/;
const LEGACY_LIFECYCLE_PROMISE_RE = new RegExp(
  [
    ["managed workspace", "lifecycle"].join(" "),
    ["managed", "commit"].join(" "),
    ["downstream", "unlock"].join(" "),
    ["Core", "owns all", "staging"].join(" "),
    ["ask Core for a managed", "plan revision"].join(" "),
    ["Core", "acceptance"].join(" "),
  ].join("|")
);

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
  assert.match(prompt, NO_PRODUCTION_FILES_RE);
  assert.match(prompt, MATERIALIZED_TRUE_RE);
  assert.match(prompt, QUALITY_GATES_START_RE);
  assert.match(prompt, INSTALLABLE_FOUNDATION_RE);
  assert.match(prompt, NO_QUALITY_GATE_PRODUCTS_RE);
  assert.match(prompt, NO_MATERIALIZE_WITH_OPEN_QUESTIONS_RE);
  assert.match(prompt, PROJECT_FOUNDATION_JSON_RE);
  assert.match(prompt, OPEN_QUESTIONS_JSON_RE);
  assert.match(prompt, NODE_MODULES_NOT_COMMITTED_RE);
  assert.match(prompt, REAL_TARGETS_RE);
  assert.match(prompt, REWRITE_BOUNDARY_RE);
  assert.match(prompt, RUNTIME_CONTEXT_OWNER_RE);
  assert.match(prompt, EMBEDDED_PLAN_CONTEXT_RE);
  assert.match(prompt, APPLICATION_SKELETON_HANDOFF_RE);
  assert.match(prompt, CANONICAL_DRAFT_TEMPLATE_RE);
  assert.match(prompt, REQUIRED_MARKDOWN_HEADINGS_RE);
  assert.match(prompt, DRAFT_JSON_LIFECYCLE_RE);
  assert.match(prompt, NO_LIFECYCLE_REPAIR_RE);
  assert.doesNotMatch(prompt, NO_ROOT_TODO_RE);
  assert.doesNotMatch(prompt, WORKSPACE_PLAN_PATH_RE);
  assert.doesNotMatch(prompt, PLAN_STATUS_COMMAND_RE);
  assert.match(prompt, NO_AD_HOC_DIAGNOSTICS_RE);
  assert.match(prompt, CODE_WRITING_WORKSPACE_RE);
  assert.match(prompt, DEVELOPMENT_TREE_MIRROR_RE);
  assert.match(prompt, CONCRETE_FRAMEWORK_BASELINE_RE);
  assert.match(prompt, MARKDOWN_IS_DECISION_ARTIFACT_RE);
  assert.match(prompt, QUESTIONS_ONLY_IN_DIALOGUE_RE);
  assert.match(prompt, NO_MARKDOWN_QUESTIONNAIRE_RE);
  assert.match(prompt, RECOMMENDED_BASELINE_RE);
  assert.match(prompt, TECHNOLOGY_HINTS_RE);
  assert.match(prompt, CONFIRMATION_STYLE_RE);
  assert.match(prompt, LOCALIZED_DRAFT_RESPONSE_RE);
  assert.match(prompt, EXACT_REVIEW_CLOSING_PHRASE_RE);
  assert.match(prompt, LOCALIZED_MATERIALIZED_RESPONSE_RE);
  assert.match(prompt, RUNTIME_REVIEW_READY_RE);
  assert.doesNotMatch(prompt, LEGACY_LIFECYCLE_PROMISE_RE);
  assert.doesNotMatch(prompt, PLAN_COMMIT_RE);
  assert.doesNotMatch(prompt, PROVIDER_STAGE_ONLY_RE);
  assert.doesNotMatch(prompt, BEFORE_COMMITTING_RE);
  assert.doesNotMatch(prompt, THEN_COMMIT_RE);
  assert.doesNotMatch(prompt, PARTIAL_COMMIT_RE);
  assert.match(prompt, DRAFT_REVISION_MICROTASK_RE);
  assert.match(prompt, MATERIALIZATION_CONTEXT_RE);
  assert.match(prompt, USER_STACK_REPLACEMENT_RE);
  assert.match(prompt, NO_STACK_DETAIL_LOOP_RE);
  assert.match(prompt, PRODUCTION_SOURCE_ROOT_RE);
  assert.match(prompt, WORKSPACE_ROOT_CURRENT_DIRECTORY_RE);
  assert.match(prompt, WORKSPACE_ROOT_JSON_RE);
  assert.match(prompt, NO_CODEAI_HUB_PRODUCTION_ROOT_RE);
  assert.match(prompt, CLUSTERED_MODULE_PATH_RE);
  assert.match(prompt, PRODUCT_PARTS_ROOT_RE);
  assert.match(prompt, SOURCE_ROOT_PRODUCT_PARTS_RE);
  assert.match(prompt, NO_CATEGORY_SPLIT_RE);
  assert.match(prompt, PRODUCT_PART_PACKAGE_MANIFEST_RE);
  assert.match(prompt, POST_MATERIALIZATION_RE);
  assert.match(prompt, STALE_DEFERRED_NOTE_RE);
  assert.match(prompt, CANONICAL_ID_RE);
});

test("application skeleton bundled contract exposes materialization state fields", () => {
  const contract = decodeTemplate("application-skeleton-contract");

  assert.match(contract, ACCEPTED_FALSE_RE);
  assert.match(contract, REVIEW_STATE_DRAFT_RE);
  assert.match(contract, MATERIALIZED_FALSE_RE);
  assert.match(contract, MATERIALIZATION_STATE_RE);
  assert.match(contract, MATERIALIZED_PATHS_RE);
  assert.match(contract, PROJECT_FOUNDATION_JSON_RE);
  assert.match(contract, OPEN_QUESTIONS_JSON_RE);
  assert.match(contract, NO_QUALITY_GATE_PRODUCTS_RE);
  assert.match(contract, NODE_MODULES_NOT_COMMITTED_RE);
  assert.match(contract, REAL_TARGETS_RE);
  assert.match(contract, ACCEPTED_AND_MATERIALIZED_RE);
  assert.match(contract, CODEAI_HUB_SOURCE_ROOT_RE);
  assert.match(contract, STANDALONE_MODULES_RE);
  assert.match(contract, STACK_ARRAYS_RE);
  assert.match(contract, PRODUCT_PARTS_ROOT_RE);
  assert.match(contract, CONTRACT_TECHNOLOGY_HINTS_RE);
  assert.match(contract, CONTRACT_CORE_LIFECYCLE_OWNER_RE);
  assert.match(contract, CONTRACT_CODE_READY_RE);
  assert.match(contract, CONTRACT_FRAMEWORK_SURFACES_RE);
  assert.match(contract, CONTRACT_DEVELOPMENT_TREE_MIRROR_RE);
  assert.match(contract, CONTRACT_MARKDOWN_DECISION_ARTIFACT_RE);
  assert.match(contract, CONTRACT_QUESTIONS_IN_DIALOGUE_RE);
  assert.match(contract, CONTRACT_NO_QUESTIONNAIRE_RE);
  assert.doesNotMatch(contract, LEGACY_LIFECYCLE_PROMISE_RE);
  assert.doesNotMatch(contract, NO_ROOT_TODO_RE);
  assert.doesNotMatch(contract, WORKSPACE_PLAN_PATH_RE);
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
