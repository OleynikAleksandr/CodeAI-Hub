import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { BUNDLED_TEMPLATE_SOURCES } from "./bundled-templates";

const DRAFT_PHASE_RE = /Phase 1: Draft Gate Contract/;
const INTEGRATION_PHASE_RE = /Phase 2: Post-Acceptance Integration/;
const ULTRACITE_RE = /Ultracite may be the primary lint\/format preset/;
const KNIP_RE = /Knip is a first-class JavaScript\/TypeScript gate/;
const SIZE_POLICY_RE = /Source files and classes must stay <= 500 lines/;
const INTEGRATION_PATHS_RE = /planned integration paths/;
const LEGACY_RESEARCH_PASS_RE = /Required Research And Design Pass/;
const DESIRED_STATUS_RE = /"desiredStatus": "active"/;
const AVAILABILITY_RE = /"availability": "not_integrated"/;
const INTEGRATION_REQUIRED_RE = /"integrationRequired": true/;
const PLANNED_PATHS_RE = /"plannedIntegrationPaths"/;
const ADVISORY_NO_BLOCKING_RE =
  /Advisory gates must not have `blockingIn` phases/;

const decodeTemplate = (id: string): string => {
  const source = BUNDLED_TEMPLATE_SOURCES.find((item) => item.id === id);
  assert.ok(source, `missing bundled template ${id}`);
  return Buffer.from(source.base64, "base64").toString("utf8");
};

test("quality gates bundled prompt keeps compact two-phase integration contract", () => {
  const prompt = decodeTemplate("quality-gates-prompt");

  assert.match(prompt, DRAFT_PHASE_RE);
  assert.match(prompt, INTEGRATION_PHASE_RE);
  assert.match(prompt, ULTRACITE_RE);
  assert.match(prompt, KNIP_RE);
  assert.match(prompt, SIZE_POLICY_RE);
  assert.match(prompt, INTEGRATION_PATHS_RE);
  assert.doesNotMatch(prompt, LEGACY_RESEARCH_PASS_RE);
});

test("quality gates bundled contract exposes integration-aware gate fields", () => {
  const contract = decodeTemplate("quality-gates-contract");

  assert.match(contract, DESIRED_STATUS_RE);
  assert.match(contract, AVAILABILITY_RE);
  assert.match(contract, INTEGRATION_REQUIRED_RE);
  assert.match(contract, PLANNED_PATHS_RE);
  assert.match(contract, ADVISORY_NO_BLOCKING_RE);
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
