import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/use-main-area-workflow-state.ts"
);

test("use-main-area-workflow-state auto-opens reviewer dialog after description handoff", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(source.includes('resolvedActiveTool === "Description"'), true);
  assert.equal(source.includes('branch?.sessionKind === "reviewer"'), true);
  assert.equal(source.includes('new CustomEvent("pm:dialog:open"'), true);
  assert.equal(source.includes('sessionKind: "reviewer"'), true);
  assert.equal(source.includes('runSlug: "reviewer"'), true);
});
