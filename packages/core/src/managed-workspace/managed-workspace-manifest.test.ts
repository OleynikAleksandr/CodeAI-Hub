import assert from "node:assert/strict";
import test from "node:test";
import {
  createManagedWorkspaceManifest,
  MANAGED_WORKSPACE_MANIFEST_RELATIVE_PATH,
  MANAGED_WORKSPACE_MANIFEST_SCHEMA,
  serializeManagedWorkspaceManifest,
} from "./managed-workspace-manifest";
import { createManagedWorkspacePaths } from "./managed-workspace-paths";

test("createManagedWorkspaceManifest captures baseline lifecycle paths", () => {
  const paths = createManagedWorkspacePaths("/tmp/workspace");
  const manifest = createManagedWorkspaceManifest({
    createdAt: "2026-05-07T00:00:00.000Z",
    paths,
  });

  assert.equal(manifest.schema, MANAGED_WORKSPACE_MANIFEST_SCHEMA);
  assert.equal(manifest.workspaceRoot, "/tmp/workspace");
  assert.equal(manifest.manifestPath, MANAGED_WORKSPACE_MANIFEST_RELATIVE_PATH);
  assert.deepEqual(manifest.ignoredStateDirectories, [
    ".codeai-hub/runtime",
    ".codeai-hub/logs",
    ".codeai-hub/cache",
  ]);
  assert.deepEqual(
    manifest.hooks.map((hook) => hook.hookName),
    ["commit-msg", "post-checkout", "post-commit", "pre-commit", "pre-push"]
  );
  assert.equal(
    manifest.paths.some((entry) => entry.tracked),
    true
  );
});

test("serializeManagedWorkspaceManifest writes stable newline JSON", () => {
  const manifest = createManagedWorkspaceManifest({
    createdAt: "2026-05-07T00:00:00.000Z",
    paths: createManagedWorkspacePaths("/tmp/workspace"),
  });
  const serialized = serializeManagedWorkspaceManifest(manifest);

  assert.equal(serialized.endsWith("\n"), true);
  assert.equal(
    JSON.parse(serialized).schema,
    MANAGED_WORKSPACE_MANIFEST_SCHEMA
  );
});
