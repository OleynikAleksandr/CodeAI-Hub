import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/use-main-area-workflow-state.ts"
);

test("use-main-area-workflow-state keeps description-first startup tool and primarySession metadata", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(source.includes("const resolveStartupTool"), true);
  assert.equal(source.includes("const stage = state?.lastActive?.stage;"), false);
  assert.equal(source.includes("const STAGE_PRIORITY"), false);
  assert.equal(source.includes("hasContinuitySegmentsForStage"), false);
  assert.equal(source.includes("branch?.primarySession?.providerSessionId"), true);
  assert.equal(source.includes("branch?.session?.providerSessionId"), false);
  assert.equal(source.includes("branch?.sessionKind"), false);
  assert.equal(source.includes('label: "questionnaire.md" as const'), true);
});
