import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { BUNDLED_TEMPLATE_SOURCES } from "./bundled-templates";

const MANAGED_STAGE_RE =
  /`Diagram Modules` is the first managed workspace stage/;
const CORE_BOOTSTRAP_RE = /Core has already bootstrapped the workspace repo/;
const EMBEDDED_PLAN_CONTEXT_RE =
  /use only the workspace plan text, active stage todo-plan text, and plan status that Core embeds/;
const INITIAL_ADOPTION_COMMIT_RE = /initial adoption commit/;
const NO_ORCHESTRATOR_INSTALL_RE =
  /Do not create, reinstall, repair, or rename git, hooks, plan scripts/;
const NO_ROOT_TODO_RE = /doc\/TODO\/todo-plan\.md/;
const WORKSPACE_PLAN_PATH_RE = /doc\/TODO\/workspace\.plan\.md/;
const PLAN_STATUS_COMMAND_RE = /npm run plan:status/;
const CORE_OWNS_COMMIT_RE =
  /Core owns staging, the managed commit, post-commit validation, and downstream unlock/;
const PLAN_COMMIT_RE = /npm run plan:commit/;
const UPSTREAM_READ_ONLY_RE =
  /`Description` and `Virtual Simulation` are read-only upstream evidence/;

const decodeTemplate = (id: string): string => {
  const source = BUNDLED_TEMPLATE_SOURCES.find((item) => item.id === id);
  assert.ok(source, `missing bundled template ${id}`);
  return Buffer.from(source.base64, "base64").toString("utf8");
};

test("diagram modules bundled prompt explains managed lifecycle boundaries", () => {
  const prompt = decodeTemplate("diagram-modules-prompt");

  assert.match(prompt, MANAGED_STAGE_RE);
  assert.match(prompt, CORE_BOOTSTRAP_RE);
  assert.match(prompt, EMBEDDED_PLAN_CONTEXT_RE);
  assert.match(prompt, INITIAL_ADOPTION_COMMIT_RE);
  assert.match(prompt, NO_ORCHESTRATOR_INSTALL_RE);
  assert.doesNotMatch(prompt, NO_ROOT_TODO_RE);
  assert.doesNotMatch(prompt, WORKSPACE_PLAN_PATH_RE);
  assert.doesNotMatch(prompt, PLAN_STATUS_COMMAND_RE);
  assert.match(prompt, CORE_OWNS_COMMIT_RE);
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
