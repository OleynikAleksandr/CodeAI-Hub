import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { BUNDLED_TEMPLATE_SOURCES } from "./bundled-templates";

const REWRITE_BOUNDARY_RE = /Rewrite boundary/;
const RUNTIME_CONTEXT_RE =
  /use only the workspace context, target artifact, and validation instructions embedded in the current runtime prompt/;
const NO_ORCHESTRATOR_INSTALL_RE =
  /Do not create, reinstall, repair, or rename git, hooks, plan scripts/;
const NO_ROOT_TODO_RE = /doc\/TODO\/todo-plan\.md/;
const WORKSPACE_PLAN_PATH_RE = /doc\/TODO\/workspace\.plan\.md/;
const PLAN_STATUS_COMMAND_RE = /npm run plan:status/;
const RUNTIME_REVIEW_READY_RE = /ready for runtime\/user review/;
const LEGACY_LIFECYCLE_PROMISE_RE = new RegExp(
  [
    ["first managed workspace", "stage"].join(" "),
    ["Core", "has already", "bootstrapped"].join(" "),
    ["initial adoption", "commit"].join(" "),
    ["managed", "commit"].join(" "),
    ["downstream", "unlock"].join(" "),
  ].join("|")
);
const PLAN_COMMIT_RE = /npm run plan:commit/;
const UPSTREAM_READ_ONLY_RE =
  /`Description` and `Virtual Simulation` are read-only upstream evidence/;

const decodeTemplate = (id: string): string => {
  const source = BUNDLED_TEMPLATE_SOURCES.find((item) => item.id === id);
  assert.ok(source, `missing bundled template ${id}`);
  return Buffer.from(source.base64, "base64").toString("utf8");
};

test("diagram modules bundled prompt explains rewrite boundaries", () => {
  const prompt = decodeTemplate("diagram-modules-prompt");

  assert.match(prompt, REWRITE_BOUNDARY_RE);
  assert.match(prompt, RUNTIME_CONTEXT_RE);
  assert.match(prompt, NO_ORCHESTRATOR_INSTALL_RE);
  assert.doesNotMatch(prompt, NO_ROOT_TODO_RE);
  assert.doesNotMatch(prompt, WORKSPACE_PLAN_PATH_RE);
  assert.doesNotMatch(prompt, PLAN_STATUS_COMMAND_RE);
  assert.match(prompt, RUNTIME_REVIEW_READY_RE);
  assert.doesNotMatch(prompt, LEGACY_LIFECYCLE_PROMISE_RE);
  assert.doesNotMatch(prompt, PLAN_COMMIT_RE);
  assert.match(prompt, UPSTREAM_READ_ONLY_RE);
});

test("diagram modules bundled prompt stays synced with agent asset", async () => {
  const root = process.cwd();
  const promptAsset = await readFile(
    path.join(
      root,
      "packages/agents/diagram-modules-agent/assets/diagram-modules-prompt.md"
    ),
    "utf8"
  );

  assert.equal(decodeTemplate("diagram-modules-prompt"), promptAsset);
});
