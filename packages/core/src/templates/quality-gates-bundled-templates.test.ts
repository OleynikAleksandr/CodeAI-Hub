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
  /Core owns the managed lifecycle baseline and hook registry/;
const ACTIVE_CHILD_PLAN_RE =
  /Read `doc\/TODO\/workspace\.plan\.md`, then read the active child plan named by `activePlanPath`/;
const NO_DIRECT_HUSKY_RE = /Do not edit `\.husky` hooks directly/;
const NO_ROOT_TODO_RE = /doc\/TODO\/todo-plan\.md/;
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
const CONTRACT_NO_DIRECT_HUSKY_RE =
  /Core renders managed hook wiring from the validated gate manifest/;

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
  assert.match(prompt, ACTIVE_CHILD_PLAN_RE);
  assert.match(prompt, NO_DIRECT_HUSKY_RE);
  assert.match(prompt, NO_PLANNED_DUPLICATES_RE);
  assert.doesNotMatch(prompt, NO_ROOT_TODO_RE);
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
  assert.match(contract, CONTRACT_NO_DIRECT_HUSKY_RE);
  assert.match(contract, NO_PLANNED_DUPLICATES_RE);
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
