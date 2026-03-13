import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const VIEWER_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/workflow-artifact-viewer.tsx"
);

const RESTART_CONTROL_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/questionnaire-restart-attempt-control.tsx"
);

test("workflow artifact viewer does not expose questionnaire restart attempt UI", async () => {
  const source = await readFile(VIEWER_SOURCE_PATH, "utf8");

  assert.equal(source.includes("QuestionnaireRestartAttemptControl"), false);
  assert.equal(source.includes("restartError"), false);
  assert.equal(source.includes("canRestartAttempt"), false);
  assert.equal(source.includes("submitQuestionnaire"), false);
  assert.equal(source.includes("Restart attempt"), false);

  await assert.rejects(access(RESTART_CONTROL_SOURCE_PATH));
});
