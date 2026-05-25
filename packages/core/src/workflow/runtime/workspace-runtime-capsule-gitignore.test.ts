import assert from "node:assert/strict";
import test from "node:test";
import { resolveWorkspaceRuntimeCapsule } from "./workspace-runtime-capsule";
import {
  buildWorkspaceRuntimeCapsuleGitignore,
  WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT,
} from "./workspace-runtime-capsule-gitignore";

test("buildWorkspaceRuntimeCapsuleGitignore resolves the capsule gitignore path", () => {
  const capsule = resolveWorkspaceRuntimeCapsule({
    workspaceRoot: "/tmp/CodeAI-Hub codex 5.4",
  });
  const gitignore = buildWorkspaceRuntimeCapsuleGitignore(capsule);

  assert.equal(
    gitignore.path.relativePath,
    ".codeai-hub/codeai-hub-codex-5-4/.gitignore"
  );
  assert.equal(gitignore.content, WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT);
});

test("workspace runtime gitignore keeps rollback state trackable", () => {
  assert.equal(
    WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT.includes(
      "!runtime/settings/settings.json"
    ),
    true
  );
  assert.equal(
    WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT.includes(
      "!runtime/sessions/unified/"
    ),
    true
  );
  assert.equal(
    WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT.includes("runtime/**/tmp/"),
    false
  );
});

test("workspace runtime gitignore excludes provider secrets and caches", () => {
  assert.equal(
    WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT.includes(
      "runtime/providers/gemini/home/.gemini/oauth_creds.json"
    ),
    true
  );
  assert.equal(
    WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT.includes(
      "runtime/providers/**/home/**/.cache/"
    ),
    true
  );
  assert.equal(
    WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT.endsWith("\n"),
    true
  );
});
