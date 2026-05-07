import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { BUNDLED_TEMPLATE_SOURCES } from "./bundled-templates";

const MANAGED_STAGE_RE =
  /`Diagram Modules` is the first managed workspace stage/;
const CORE_BOOTSTRAP_RE = /Core has already bootstrapped the workspace repo/;
const NO_ORCHESTRATOR_INSTALL_RE =
  /Do not create, reinstall, repair, or rename git, hooks, plan scripts/;
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
  assert.match(prompt, NO_ORCHESTRATOR_INSTALL_RE);
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
