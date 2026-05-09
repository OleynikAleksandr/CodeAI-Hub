import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { BUNDLED_TEMPLATE_SOURCES } from "./bundled-templates";

const DRAFT_PHASE_RE = /Phase 1: Draft Gate Contract/;
const INTEGRATION_PHASE_RE = /Phase 2: Post-Acceptance Integration/;
const SIZE_POLICY_RE = /Source files and classes must stay <= 500 lines/;
const STACK_RESEARCH_RE = /stack-specific research/;
const NEEDS_USER_DECISION_RE = /needs_user_decision/;
const INTEGRATION_PATHS_RE = /planned integration paths/;
const CORE_HOOK_REGISTRY_RE =
  /Core owns the managed lifecycle baseline, git setup, plan scripts, workspace plan state, active stage todo-plan state/;
const EMBEDDED_PLAN_CONTEXT_RE =
  /Use only the workspace plan text, active stage todo-plan text, and plan status that Core embeds/;
const QUALITY_GATES_HANDOFF_RE =
  /embedded Core plan status must say `activeStage: "quality_gates"`/;
const NO_LIFECYCLE_RESTORE_RE =
  /must not rewrite, restore, revert, checkout, or replace the Core-owned lifecycle baseline/;
const HOOK_WIRING_RE =
  /Phase 2 must wire the accepted required gate scope into the managed lifecycle hooks/;
const AGGREGATE_PRE_COMMIT_RE = /qg:before-commit/;
const AGGREGATE_PRE_PUSH_RE = /qg:before-push/;
const PRESERVE_PLAN_VALIDATE_RE =
  /Preserve existing Core lifecycle commands such as `plan:validate`/;
const CORE_OWNS_COMMIT_RE =
  /Core owns all staging, the managed commit, post-commit validation, and child-plan advancement/;
const PLAN_COMMIT_RE = /npm run plan:commit/;
const PROVIDER_STAGE_ONLY_RE = /stage only the two canonical/u;
const CLEAN_GIT_RE = /git status --short/;
const CORE_UNLOCK_RE =
  /unlocked` language requires Core confirmation|Core has confirmed the Quality Gates root gate is integrated\/unlocked/s;
const GATE_CONTRACT_REVISION_RE = /ask Core for a managed plan revision/;
const INTEGRATION_CONTEXT_RE =
  /runtime-provided managed context is still for the Quality Gates integration task/;
const NO_ROOT_TODO_RE = /doc\/TODO\/todo-plan\.md/;
const WORKSPACE_PLAN_PATH_RE = /doc\/TODO\/workspace\.plan\.md/;
const PLAN_STATUS_COMMAND_RE = /npm run plan:status/;
const NO_PLANNED_DUPLICATES_RE =
  /`plannedRequiredAfterIntegration` must not duplicate ids already listed/;
const LEGACY_RESEARCH_PASS_RE = /Required Research And Design Pass/;
const HARDCODED_ULTRACITE_RE =
  /Ultracite may be the primary lint\/format preset/;
const HARDCODED_KNIP_RE = /Knip is a first-class JavaScript\/TypeScript gate/;
const DEVELOPMENT_TREE_SESSION_RE = /Development Tree Session/i;
const DEVELOPMENT_TREE_SESSIONS_RE = /Development Tree sessions/i;
const COMMANDS_OBJECT_RE = /`commands` object keyed by stable gate id/;
const DESIRED_STATUS_RE = /"desiredStatus": "active"/;
const AVAILABILITY_RE = /"availability": "not_integrated"/;
const INTEGRATION_REQUIRED_RE = /"integrationRequired": true/;
const PLANNED_PATHS_RE = /"plannedIntegrationPaths"/;
const COMMANDS_MAP_RULE_RE =
  /`commands` must be an object\/map keyed by gate id/;
const ADVISORY_NO_BLOCKING_RE =
  /Advisory gates must not have `blockingIn` phases/;
const CONTRACT_HOOK_BOUNDARY_RE = /Managed Hook Boundary/;
const CONTRACT_CHILD_PLAN_RE =
  /Core owns git setup, the lifecycle baseline inside `\.husky` hooks, plan scripts, workspace plan state, active stage todo-plan state/;
const CONTRACT_HOOK_AGGREGATE_RE =
  /Hook wiring may be direct .* or aggregate .*qg:before-commit.*qg:before-push/s;
const CONTRACT_INTEGRATED_HOOK_RE =
  /`integrated: true` requires lifecycle hook wiring/;

const decodeTemplate = (id: string): string => {
  const source = BUNDLED_TEMPLATE_SOURCES.find((item) => item.id === id);
  assert.ok(source, `missing bundled template ${id}`);
  return Buffer.from(source.base64, "base64").toString("utf8");
};

test("quality gates bundled prompt keeps compact two-phase integration contract", () => {
  const prompt = decodeTemplate("quality-gates-prompt");

  assert.match(prompt, DRAFT_PHASE_RE);
  assert.match(prompt, INTEGRATION_PHASE_RE);
  assert.match(prompt, SIZE_POLICY_RE);
  assert.match(prompt, STACK_RESEARCH_RE);
  assert.match(prompt, NEEDS_USER_DECISION_RE);
  assert.match(prompt, INTEGRATION_PATHS_RE);
  assert.match(prompt, CORE_HOOK_REGISTRY_RE);
  assert.match(prompt, EMBEDDED_PLAN_CONTEXT_RE);
  assert.match(prompt, QUALITY_GATES_HANDOFF_RE);
  assert.match(prompt, NO_LIFECYCLE_RESTORE_RE);
  assert.match(prompt, HOOK_WIRING_RE);
  assert.match(prompt, AGGREGATE_PRE_COMMIT_RE);
  assert.match(prompt, AGGREGATE_PRE_PUSH_RE);
  assert.match(prompt, PRESERVE_PLAN_VALIDATE_RE);
  assert.match(prompt, CORE_OWNS_COMMIT_RE);
  assert.doesNotMatch(prompt, PLAN_COMMIT_RE);
  assert.doesNotMatch(prompt, PROVIDER_STAGE_ONLY_RE);
  assert.doesNotMatch(prompt, CLEAN_GIT_RE);
  assert.match(prompt, CORE_UNLOCK_RE);
  assert.match(prompt, GATE_CONTRACT_REVISION_RE);
  assert.match(prompt, INTEGRATION_CONTEXT_RE);
  assert.match(prompt, NO_PLANNED_DUPLICATES_RE);
  assert.doesNotMatch(prompt, NO_ROOT_TODO_RE);
  assert.doesNotMatch(prompt, WORKSPACE_PLAN_PATH_RE);
  assert.doesNotMatch(prompt, PLAN_STATUS_COMMAND_RE);
  assert.match(prompt, COMMANDS_OBJECT_RE);
  assert.doesNotMatch(prompt, HARDCODED_ULTRACITE_RE);
  assert.doesNotMatch(prompt, HARDCODED_KNIP_RE);
  assert.doesNotMatch(prompt, DEVELOPMENT_TREE_SESSION_RE);
  assert.doesNotMatch(prompt, DEVELOPMENT_TREE_SESSIONS_RE);
  assert.doesNotMatch(prompt, LEGACY_RESEARCH_PASS_RE);
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
  assert.match(contract, CONTRACT_HOOK_AGGREGATE_RE);
  assert.match(contract, CONTRACT_INTEGRATED_HOOK_RE);
  assert.match(contract, NO_PLANNED_DUPLICATES_RE);
  assert.doesNotMatch(contract, NO_ROOT_TODO_RE);
  assert.doesNotMatch(contract, WORKSPACE_PLAN_PATH_RE);
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
