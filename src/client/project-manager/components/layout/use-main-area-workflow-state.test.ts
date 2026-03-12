import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const SOURCE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/use-main-area-workflow-state.ts"
);
const WORKSPACE_TREE_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/workspace-tree.tsx"
);
const SHARED_HOOK_PATH = path.resolve(
  process.cwd(),
  "src/client/project-manager/components/layout/use-workspace-workflow-state.ts"
);

test("use-main-area-workflow-state resolves description sync through shared helper state", async () => {
  const source = await readFile(SOURCE_PATH, "utf8");

  assert.equal(
    source.includes(
      'import { useWorkspaceWorkflowState } from "./use-workspace-workflow-state";'
    ),
    true
  );
  assert.equal(
    source.includes(
      "const descriptionArtifact = resolveDescriptionArtifact(branch, workspaceSlug);"
    ),
    true
  );
  assert.equal(
    source.includes(
      "const nextHasDescriptionSession = resolveDescriptionHasSession(workflowState);"
    ),
    true
  );
});

test("layout workflow consumers stay on shared workspace workflow state entrypoint", async () => {
  const [mainAreaSource, workspaceTreeSource, sharedHookSource] =
    await Promise.all([
      readFile(SOURCE_PATH, "utf8"),
      readFile(WORKSPACE_TREE_PATH, "utf8"),
      readFile(SHARED_HOOK_PATH, "utf8"),
    ]);

  assert.equal(
    mainAreaSource.includes('import { useWorkspaceWorkflowState } from "./use-workspace-workflow-state";'),
    true
  );
  assert.equal(
    workspaceTreeSource.includes('import { useWorkspaceWorkflowState } from "./use-workspace-workflow-state";'),
    true
  );
  assert.equal(mainAreaSource.includes("api.getWorkflowState("), false);
  assert.equal(workspaceTreeSource.includes("api.getWorkflowState("), false);
  assert.equal(sharedHookSource.includes("entry.state = await api.getWorkflowState("), true);
});
