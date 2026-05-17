import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const DETACHED_VIEW_SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/diagram-editor/detached-diagram-view.tsx"
);

test("detached diagram view refreshes from workflow-state changes", async () => {
  const source = await readFile(DETACHED_VIEW_SOURCE_PATH, "utf8");

  assert.equal(source.includes("useWorkflowStateSnapshot"), true);
  assert.equal(source.includes("workflowStateStore.activate(workspaceSlug, workspacePath)"), true);
  assert.equal(source.includes("workflowStateStore.deactivate()"), true);
  assert.equal(
    source.includes("buildWorkflowStateChangeToken(workflowStoreState.snapshot)"),
    true
  );
  assert.equal(source.includes("workflowStoreState.loaded"), true);
  assert.equal(
    source.includes("workflowStoreState.workspaceSlug !== workspaceSlug"),
    true
  );
  assert.equal(
    source.includes("workflowStoreState.workspacePath !== workspacePath"),
    true
  );

  const refreshTriggers = source.match(/setRefreshKey\(\(k\) => k \+ 1\)/g) ?? [];
  assert.equal(
    refreshTriggers.length >= 2,
    true,
    `expected sidecar and workflow-state refresh triggers, found ${refreshTriggers.length}`
  );
});
