import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  createManagedWorkspacePaths,
  isManagedWorkspacePathInsideRoot,
} from "./managed-workspace-paths";

test("createManagedWorkspacePaths resolves managed baseline paths", () => {
  const workspaceRoot = path.join("/tmp", "managed-workspace");
  const paths = createManagedWorkspacePaths(workspaceRoot);

  assert.equal(paths.workspaceRoot, workspaceRoot);
  assert.equal(paths.todoPlan.relativePath, "doc/TODO/todo-plan.md");
  assert.equal(paths.controlPlaneRoot.relativePath, ".codeai-hub/workflow");
  assert.equal(paths.hooks.length, 5);
  assert.deepEqual(
    paths.ignoredStateDirectories.map((entry) => entry.relativePath),
    [".codeai-hub/runtime", ".codeai-hub/logs", ".codeai-hub/cache"]
  );
});

test("createManagedWorkspacePaths marks tracked and ignored state correctly", () => {
  const paths = createManagedWorkspacePaths("/tmp/managed-workspace");

  assert.equal(paths.todoPlan.tracked, true);
  assert.equal(paths.planCommandDirectory.tracked, true);
  assert.equal(paths.packageManifest.tracked, true);
  assert.equal(paths.workflowRevisionDirectories.length, 3);
  assert.equal(
    paths.ignoredStateDirectories.every((entry) => !entry.tracked),
    true
  );
});

test("isManagedWorkspacePathInsideRoot rejects sibling paths", () => {
  assert.equal(
    isManagedWorkspacePathInsideRoot(
      "/tmp/workspace",
      "/tmp/workspace/file.md"
    ),
    true
  );
  assert.equal(
    isManagedWorkspacePathInsideRoot(
      "/tmp/workspace",
      "/tmp/workspace-sibling/file.md"
    ),
    false
  );
});
