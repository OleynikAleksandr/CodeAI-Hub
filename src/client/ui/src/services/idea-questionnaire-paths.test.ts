import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  buildCanonicalQuestionnairePath,
  resolveQuestionnaireTargets,
} from "./idea-questionnaire-paths";

const WORKSPACE_FILE_SERVICE_PATH = path.resolve(
  process.cwd(),
  "packages/core/src/remote-bridge/handlers/workspace-file-service.ts"
);

test("resolveQuestionnaireTargets always returns canonical questionnaire path without legacy fallbacks", () => {
  const workspaceSlug = "demo-workspace";
  const expected = buildCanonicalQuestionnairePath(workspaceSlug);

  const targets = [
    resolveQuestionnaireTargets(
      `.codeai-hub/${workspaceSlug}/description/description.md`
    ),
    resolveQuestionnaireTargets(
      `.codeai-hub/${workspaceSlug}/description/runs/run-1/description.md`
    ),
    resolveQuestionnaireTargets(
      `.codeai-hub/${workspaceSlug}/description/idea/idea.md`
    ),
    resolveQuestionnaireTargets(
      `.codeai-hub/${workspaceSlug}/description/runs/run-1/idea/idea.md`
    ),
  ];

  for (const target of targets) {
    assert.equal(target.primaryPath, expected);
    assert.deepEqual(target.readFallbackPaths, []);
  }
});

test("workspace-file-service no longer mirrors legacy run questionnaire writes into canonical description path", async () => {
  const source = await readFile(WORKSPACE_FILE_SERVICE_PATH, "utf8");

  assert.equal(source.includes("LEGACY_RUN_QUESTIONNAIRE_SUFFIX"), false);
  assert.equal(source.includes("isLegacyRunQuestionnairePath("), false);
  assert.equal(source.includes("resolveCanonicalQuestionnairePath("), false);
});
