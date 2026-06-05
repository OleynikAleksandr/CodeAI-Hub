import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { BUNDLED_TEMPLATE_SOURCES } from "./bundled-templates";

const RESEARCH_PHASE_RE = /Research Pass: Current Tooling Review/;
const DRAFT_PHASE_RE = /Contract Draft Pass: Gate Contract/;
const LEGACY_SUBPHASE_RE = /Phase 1A|Phase 1B/;
const REVIEW_PHASE_RE = /Phase 2: User-Led Review/;
const INTEGRATION_PHASE_RE = /Phase 3: Post-Acceptance Integration/;
const FORMAL_VERIFICATION_PHASE_RE =
  /Phase 4: Formal Quality Gates Verification/;
const ACCEPTANCE_BOUNDARY_RE = /Acceptance is a user\/runtime decision/;
const NO_SELF_ACCEPT_RE = /Do not set `accepted: true` yourself/;
const SIZE_POLICY_RE = /Source files and classes must stay <= 500 lines/;
const MANDATORY_SIZE_GATE_RE = /mandatory executable gate/;
const STRUCTURED_SIZE_POLICY_RE = /"type": "source_size_limit"/;
const STRUCTURED_SIZE_POLICY_LIMIT_RE = /"maxLines": 500/;
const STRUCTURED_SIZE_POLICY_SCOPE_RE =
  /"appliesTo": \["source_files", "classes"\]/;
const STACK_RESEARCH_RE = /stack-specific research/;
const AGENT_ORIENTED_GATES_RE = /AI-agent-oriented quality gate/;
const ULTRACITE_EXAMPLE_RE = /https:\/\/www\.ultracite\.ai/;
const CONTRACT_CARRY_FORWARD_RE = /Recommended Contract Carry-Forward/;
const NEEDS_USER_DECISION_RE = /needs_user_decision/;
const INTEGRATION_PATHS_RE = /planned integration paths/;
const CORE_HOOK_REGISTRY_RE =
  /orchestration rewrite boundary does not provide automatic commit ownership or child-plan handoff/;
const EMBEDDED_PLAN_CONTEXT_RE =
  /Use only the workspace context, target artifacts, and validation instructions embedded in the current runtime prompt/;
const QUALITY_GATES_HANDOFF_RE =
  /runtime prompt must explicitly identify the Quality Gates stage and target artifact/;
const NO_LIFECYCLE_RESTORE_RE =
  /must not rewrite, restore, revert, checkout, or replace git setup, existing hooks, plan scripts/;
const HOOK_WIRING_RE = /must explicitly call every gate id/u;
const MATERIALIZATION_COMPLETE_RE =
  /Materialization is not complete until all accepted required gates have executable package scripts/u;
const AGENT_OWNS_PHASE3_HOOK_RE =
  /During Phase 3, the Quality Gates hook section is agent-owned integration work/u;
const NO_CORE_PENDING_HOOK_RE =
  /Do not describe `\.husky\/pre-commit` or `\.husky\/pre-push` updates as deferred to another actor/u;
const AGGREGATE_PRE_COMMIT_RE = /qg:before-commit/;
const AGGREGATE_PRE_PUSH_RE = /qg:before-push/;
const PRESERVE_PLAN_VALIDATE_RE =
  /Preserve existing project hook commands such as `plan:validate`/;
const RUNTIME_REVIEW_READY_RE = /ready for runtime review/;
const EXACT_REVIEW_CLOSING_PHRASE_RE =
  /Пожалуйста, подтвердите контракт или перечислите правки, которые нужно внести перед интеграцией\./;
const PLAN_COMMIT_RE = /npm run plan:commit/;
const PROVIDER_STAGE_ONLY_RE = /stage only the two canonical/u;
const CLEAN_GIT_RE = /git status --short/;
const CORE_UNLOCK_RE =
  /do not claim completion beyond readiness|`unlocked` language is not allowed/s;
const GATE_CONTRACT_REVISION_RE =
  /Do not edit plan files or create lifecycle tasks yourself/;
const INTEGRATION_CONTEXT_RE =
  /runtime-provided context is still for the Quality Gates integration task/;
const PHASE3_NOT_TERMINAL_RE =
  /Phase 3 integration is not terminal and must not open persistent return by itself/u;
const VERIFY_HOOK_SCRIPT_RESOLUTION_RE =
  /Resolve every `npm run <script>` command referenced by `\.husky\/pre-commit` and `\.husky\/pre-push` against `package\.json\.scripts`/u;
const VERIFY_REQUIRED_COMMANDS_RE =
  /npm run qg:before-module-execution[\s\S]*npm run qg:before-commit[\s\S]*npm run qg:before-push[\s\S]*sh \.husky\/pre-commit[\s\S]*sh \.husky\/pre-push[\s\S]*npm run qg:all/u;
const VERIFIED_STATE_RE = /verificationState: "verified"/;
const NO_ROOT_TODO_RE = /doc\/TODO\/todo-plan\.md/;
const WORKSPACE_PLAN_PATH_RE = /doc\/TODO\/workspace\.plan\.md/;
const PLAN_STATUS_COMMAND_RE = /npm run plan:status/;
const NO_PLANNED_DUPLICATES_RE =
  /`plannedRequiredAfterIntegration` must not duplicate ids already listed/;
const PLANNED_REQUIRED_ACTIVE_RE =
  /plannedRequiredAfterIntegration`, keep the matching command active and integration-required/u;
const NO_PLANNED_REQUIRED_ADVISORY_RE =
  /Do not describe these gates as non-blocking, advisory, deferred, or optional before integration/u;
const LEGACY_RESEARCH_PASS_RE = /Required Research And Design Pass/;
const HARDCODED_ULTRACITE_RE =
  /Ultracite may be the primary lint\/format preset/;
const HARDCODED_KNIP_RE = /Knip is a first-class JavaScript\/TypeScript gate/;
const DEVELOPMENT_TREE_SESSION_RE = /Development Tree Session/i;
const DEVELOPMENT_TREE_SESSIONS_RE = /Development Tree sessions/i;
const COMMANDS_OBJECT_RE = /`commands` object keyed by stable gate id/;
const RESEARCH_MARKDOWN_TEMPLATE_RE =
  /Required `quality-gates-research\.md` template:[\s\S]*# Quality Gates Research/u;
const RESEARCH_MARKDOWN_LANGUAGE_RE =
  /quality-gates-research\.md` in the same language you use to communicate with the user in chat/u;
const RESEARCH_TEMPLATE_LANGUAGE_RE =
  /All prose placeholders in this Markdown template must be filled in the chat language used with the user/u;
const RESEARCH_JSON_TEMPLATE_RE =
  /Required `quality-gates-research\.json` template:[\s\S]*"schema": "codeai-quality-gates-research-v1"/u;
const CONTRACT_MARKDOWN_TEMPLATE_RE =
  /Required `quality-gates\.md` contract template:[\s\S]*# Quality Gates Baseline/u;
const CONTRACT_JSON_TEMPLATE_RE =
  /Required `quality-gates\.json` contract template:[\s\S]*"schema": "codeai-quality-gates-v1"/u;
const RESEARCH_PASS_CONTRACT_FORBIDDEN_RE =
  /Do not create `quality-gates\.md` or `quality-gates\.json` during the research pass/u;
const DESIRED_STATUS_RE = /"desiredStatus": "active"/;
const AVAILABILITY_RE = /"availability": "not_integrated"/;
const INTEGRATION_REQUIRED_RE = /"integrationRequired": true/;
const PLANNED_PATHS_RE = /"plannedIntegrationPaths"/;
const COMMANDS_MAP_RULE_RE =
  /`commands` must be an object\/map keyed by gate id/;
const ADVISORY_NO_BLOCKING_RE =
  /Advisory gates must not have `blockingIn` phases/;
const CONTRACT_HOOK_BOUNDARY_RE = /Project Hook Boundary/;
const CONTRACT_CHILD_PLAN_RE =
  /orchestration rewrite boundary does not provide automatic commit ownership or child-plan handoff/;
const CONTRACT_HOOK_DIRECT_EVIDENCE_RE =
  /Hook wiring evidence must include direct `npm run qg:<gate>` calls/s;
const CONTRACT_AGGREGATE_NOT_SUFFICIENT_RE =
  /Aggregate commands .* are not sufficient evidence by themselves/s;
const CONTRACT_INTEGRATED_HOOK_RE =
  /`integrated: true` requires explicit lifecycle hook wiring/;
const CONTRACT_NO_CORE_PENDING_HOOK_RE =
  /`integrated: true` is invalid if required hook wiring is described as deferred to another actor/u;
const LEGACY_LIFECYCLE_PROMISE_RE = new RegExp(
  [
    ["Core", "owned"].join("-"),
    ["Core", "owns"].join(" "),
    ["managed", "lifecycle"].join(" "),
    ["managed", "commit"].join(" "),
    ["Core", "injected"].join("-"),
    ["docs:", "accept"].join(" "),
    ["managed", "plan"].join(" "),
    ["downstream", "unlock"].join(" "),
    ["Core", "confirmation"].join(" "),
    ["pending", "regeneration"].join(" "),
  ].join("|")
);

const decodeTemplate = (id: string): string => {
  const source = BUNDLED_TEMPLATE_SOURCES.find((item) => item.id === id);
  assert.ok(source, `missing bundled template ${id}`);
  return Buffer.from(source.base64, "base64").toString("utf8");
};

test("quality gates bundled prompt keeps research-first integration contract", () => {
  const prompt = decodeTemplate("quality-gates-prompt");

  assert.match(prompt, RESEARCH_PHASE_RE);
  assert.match(prompt, DRAFT_PHASE_RE);
  assert.doesNotMatch(prompt, LEGACY_SUBPHASE_RE);
  assert.match(prompt, REVIEW_PHASE_RE);
  assert.match(prompt, INTEGRATION_PHASE_RE);
  assert.match(prompt, FORMAL_VERIFICATION_PHASE_RE);
  assert.match(prompt, ACCEPTANCE_BOUNDARY_RE);
  assert.match(prompt, NO_SELF_ACCEPT_RE);
  assert.match(prompt, SIZE_POLICY_RE);
  assert.match(prompt, MANDATORY_SIZE_GATE_RE);
  assert.match(prompt, STRUCTURED_SIZE_POLICY_RE);
  assert.match(prompt, STRUCTURED_SIZE_POLICY_LIMIT_RE);
  assert.match(prompt, STRUCTURED_SIZE_POLICY_SCOPE_RE);
  assert.match(prompt, STACK_RESEARCH_RE);
  assert.match(prompt, AGENT_ORIENTED_GATES_RE);
  assert.match(prompt, ULTRACITE_EXAMPLE_RE);
  assert.match(prompt, CONTRACT_CARRY_FORWARD_RE);
  assert.match(prompt, NEEDS_USER_DECISION_RE);
  assert.match(prompt, INTEGRATION_PATHS_RE);
  assert.match(prompt, CORE_HOOK_REGISTRY_RE);
  assert.match(prompt, EMBEDDED_PLAN_CONTEXT_RE);
  assert.match(prompt, QUALITY_GATES_HANDOFF_RE);
  assert.match(prompt, NO_LIFECYCLE_RESTORE_RE);
  assert.match(prompt, HOOK_WIRING_RE);
  assert.match(prompt, MATERIALIZATION_COMPLETE_RE);
  assert.match(prompt, AGENT_OWNS_PHASE3_HOOK_RE);
  assert.match(prompt, NO_CORE_PENDING_HOOK_RE);
  assert.match(prompt, AGGREGATE_PRE_COMMIT_RE);
  assert.match(prompt, AGGREGATE_PRE_PUSH_RE);
  assert.match(prompt, PRESERVE_PLAN_VALIDATE_RE);
  assert.match(prompt, RUNTIME_REVIEW_READY_RE);
  assert.match(prompt, EXACT_REVIEW_CLOSING_PHRASE_RE);
  assert.doesNotMatch(prompt, PLAN_COMMIT_RE);
  assert.doesNotMatch(prompt, PROVIDER_STAGE_ONLY_RE);
  assert.doesNotMatch(prompt, CLEAN_GIT_RE);
  assert.match(prompt, CORE_UNLOCK_RE);
  assert.match(prompt, GATE_CONTRACT_REVISION_RE);
  assert.match(prompt, INTEGRATION_CONTEXT_RE);
  assert.match(prompt, PHASE3_NOT_TERMINAL_RE);
  assert.match(prompt, VERIFY_HOOK_SCRIPT_RESOLUTION_RE);
  assert.match(prompt, VERIFY_REQUIRED_COMMANDS_RE);
  assert.match(prompt, VERIFIED_STATE_RE);
  assert.match(prompt, NO_PLANNED_DUPLICATES_RE);
  assert.match(prompt, PLANNED_REQUIRED_ACTIVE_RE);
  assert.match(prompt, NO_PLANNED_REQUIRED_ADVISORY_RE);
  assert.doesNotMatch(prompt, NO_ROOT_TODO_RE);
  assert.doesNotMatch(prompt, WORKSPACE_PLAN_PATH_RE);
  assert.doesNotMatch(prompt, PLAN_STATUS_COMMAND_RE);
  assert.match(prompt, COMMANDS_OBJECT_RE);
  assert.match(prompt, RESEARCH_MARKDOWN_TEMPLATE_RE);
  assert.match(prompt, RESEARCH_MARKDOWN_LANGUAGE_RE);
  assert.match(prompt, RESEARCH_TEMPLATE_LANGUAGE_RE);
  assert.match(prompt, RESEARCH_JSON_TEMPLATE_RE);
  assert.match(prompt, CONTRACT_MARKDOWN_TEMPLATE_RE);
  assert.match(prompt, CONTRACT_JSON_TEMPLATE_RE);
  assert.match(prompt, RESEARCH_PASS_CONTRACT_FORBIDDEN_RE);
  assert.doesNotMatch(prompt, HARDCODED_ULTRACITE_RE);
  assert.doesNotMatch(prompt, HARDCODED_KNIP_RE);
  assert.doesNotMatch(prompt, DEVELOPMENT_TREE_SESSION_RE);
  assert.doesNotMatch(prompt, DEVELOPMENT_TREE_SESSIONS_RE);
  assert.doesNotMatch(prompt, LEGACY_RESEARCH_PASS_RE);
  assert.doesNotMatch(prompt, LEGACY_LIFECYCLE_PROMISE_RE);
});

test("quality gates bundled contract exposes integration-aware gate fields", () => {
  const contract = decodeTemplate("quality-gates-contract");

  assert.match(contract, DESIRED_STATUS_RE);
  assert.match(contract, AVAILABILITY_RE);
  assert.match(contract, INTEGRATION_REQUIRED_RE);
  assert.match(contract, PLANNED_PATHS_RE);
  assert.match(contract, COMMANDS_MAP_RULE_RE);
  assert.match(contract, ADVISORY_NO_BLOCKING_RE);
  assert.match(contract, CONTRACT_HOOK_BOUNDARY_RE);
  assert.match(contract, CONTRACT_CHILD_PLAN_RE);
  assert.match(contract, CONTRACT_HOOK_DIRECT_EVIDENCE_RE);
  assert.match(contract, CONTRACT_AGGREGATE_NOT_SUFFICIENT_RE);
  assert.match(contract, CONTRACT_INTEGRATED_HOOK_RE);
  assert.match(contract, CONTRACT_NO_CORE_PENDING_HOOK_RE);
  assert.match(contract, NO_PLANNED_DUPLICATES_RE);
  assert.doesNotMatch(contract, NO_ROOT_TODO_RE);
  assert.doesNotMatch(contract, WORKSPACE_PLAN_PATH_RE);
  assert.doesNotMatch(contract, LEGACY_LIFECYCLE_PROMISE_RE);
});

test("quality gates bundled templates stay synced with agent assets", async () => {
  const root = process.cwd();
  const promptAsset = await readFile(
    path.join(
      root,
      "packages/agents/quality-gates-agent/assets/quality-gates-prompt.md"
    ),
    "utf8"
  );
  const contractAsset = await readFile(
    path.join(
      root,
      "packages/agents/quality-gates-agent/assets/quality-gates-contract.md"
    ),
    "utf8"
  );

  assert.equal(decodeTemplate("quality-gates-prompt"), promptAsset);
  assert.equal(decodeTemplate("quality-gates-contract"), contractAsset);
});
