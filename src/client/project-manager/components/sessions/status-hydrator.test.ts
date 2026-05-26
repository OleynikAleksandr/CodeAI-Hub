import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/sessions/status-hydrator.ts"
);

test("Project Manager status hydrator refreshes sessions after workflow Clear", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.match(source, /pm:workflow-step:cleared/u);
  assert.match(source, /window\.addEventListener\(WORKFLOW_CLEAR_EVENT/u);
  assert.match(source, /window\.removeEventListener\(\s*WORKFLOW_CLEAR_EVENT/u);
  assert.match(source, /handleWorkflowStepCleared/u);
  assert.match(source, /hydrateFromStatus\(config, \{ force: true \}\)/u);
  assert.match(source, /queuedHydrateConfigRef/u);
  assert.match(source, /message\.type !== "core:state"/u);
});
