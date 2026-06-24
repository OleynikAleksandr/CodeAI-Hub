import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  buildWorkspaceRuntimeRelativePath,
  normalizeWorkspaceRuntimeSlug,
  resolveWorkspaceRuntimeCapsule,
} from "./workspace-runtime-capsule";

const WORKSPACE_ROOT = "/Users/demo/VSCODE/CodeAI-Hub codex 5.4";
const CANNOT_ESCAPE_ROOT_RE = /cannot escape root/u;

test("normalizeWorkspaceRuntimeSlug derives a stable file-system slug", () => {
  assert.equal(
    normalizeWorkspaceRuntimeSlug("CodeAI-Hub codex 5.4"),
    "codeai-hub-codex-5-4"
  );
  assert.equal(normalizeWorkspaceRuntimeSlug("   "), "workspace");
});

test("resolveWorkspaceRuntimeCapsule resolves workspace-owned runtime roots", () => {
  const capsule = resolveWorkspaceRuntimeCapsule({
    workspaceRoot: WORKSPACE_ROOT,
  });
  const resolvedRoot = path.resolve(WORKSPACE_ROOT);

  assert.equal(capsule.workspaceRoot, resolvedRoot);
  assert.equal(capsule.workspaceSlug, "codeai-hub-codex-5-4");
  assert.equal(
    capsule.runtimeRoot.relativePath,
    ".codeai-hub/codeai-hub-codex-5-4/runtime"
  );
  assert.equal(
    capsule.runtimeRoot.absolutePath,
    path.join(resolvedRoot, ".codeai-hub/codeai-hub-codex-5-4/runtime")
  );
  assert.equal(
    capsule.settingsFile.relativePath,
    ".codeai-hub/codeai-hub-codex-5-4/runtime/settings/settings.json"
  );
  assert.equal(
    capsule.unifiedSessionsRoot.relativePath,
    ".codeai-hub/codeai-hub-codex-5-4/runtime/sessions/unified"
  );
  assert.equal(
    capsule.providerHomes.kimi.relativePath,
    ".codeai-hub/codeai-hub-codex-5-4/runtime/providers/kimi/home"
  );
  assert.equal(
    capsule.providerHomes["glm-opencode"].relativePath,
    ".codeai-hub/codeai-hub-codex-5-4/runtime/providers/opencode/home"
  );
  assert.equal(
    capsule.providerHomes.codex.absolutePath,
    path.join(
      resolvedRoot,
      ".codeai-hub/codeai-hub-codex-5-4/runtime/providers/codex/home"
    )
  );
});

test("resolveWorkspaceRuntimeCapsule derives the slug from the workspace basename, not the full path", () => {
  const workspaceRoot = "/Users/oleksandroliinyk/VSCODE/CodeAI-Hub codex 5.4";
  const capsule = resolveWorkspaceRuntimeCapsule({ workspaceRoot });

  assert.equal(capsule.workspaceSlug, "codeai-hub-codex-5-4");
  assert.notEqual(
    capsule.workspaceSlug,
    "users-oleksandroliinyk-vscode-codeai-hub-codex-5-4"
  );
  assert.equal(
    capsule.localizationRoot.relativePath,
    ".codeai-hub/codeai-hub-codex-5-4/runtime/localization"
  );
});

test("resolveWorkspaceRuntimeCapsule prefers an explicit workspace slug", () => {
  const capsule = resolveWorkspaceRuntimeCapsule({
    workspaceRoot: WORKSPACE_ROOT,
    workspaceSlug: "Demo Workspace",
  });

  assert.equal(capsule.workspaceSlug, "demo-workspace");
  assert.equal(
    capsule.workspaceCapsuleRoot.relativePath,
    ".codeai-hub/demo-workspace"
  );
});

test("buildWorkspaceRuntimeRelativePath rejects parent-directory escapes", () => {
  assert.throws(
    () => buildWorkspaceRuntimeRelativePath("demo-workspace", "../settings"),
    CANNOT_ESCAPE_ROOT_RE
  );
});
