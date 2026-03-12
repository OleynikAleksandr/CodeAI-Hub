import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/use-stage-panel-sync.ts"
);

test("use-stage-panel-sync replays the last activated stage when workflow state catches up", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes('import { useCallback, useEffect, useRef } from "react";'),
    true,
    "stage panel sync must keep local stage memory via useRef"
  );
  assert.equal(
    source.includes("const lastActivatedStageRef = useRef<string | null>(null);"),
    true,
    "stage panel sync must persist the last activated stage across workflowState refreshes"
  );
  assert.equal(
    source.includes("lastActivatedStageRef.current = stage;"),
    true,
    "manual stage activation must update the remembered stage"
  );
  assert.equal(
    source.includes("const stage = lastActivatedStageRef.current;"),
    true,
    "workflow-state refresh must reuse the remembered stage"
  );
  assert.equal(
    source.includes("syncPanelsToStage(stage);"),
    true,
    "workflow-state refresh must replay panel synchronization for the remembered stage"
  );
  assert.equal(
    source.includes("lastActivatedStageRef.current = null;"),
    true,
    "workspace changes must clear stale stage memory before replay"
  );
});
