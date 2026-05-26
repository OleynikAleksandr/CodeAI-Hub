import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import {
  bootstrapWorkspaceRuntimeCapsule,
  resolveWorkspaceRuntimeCapsule,
} from "./workspace-runtime-capsule";
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
    false
  );
  assert.equal(
    WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT.includes("runtime/settings/"),
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

test("bootstrap updates an existing capsule gitignore to the current rollback contract", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "codeai-runtime-gitignore-")
  );
  const capsule = resolveWorkspaceRuntimeCapsule({ workspaceRoot });
  await mkdir(path.dirname(capsule.gitignoreFile.absolutePath), {
    recursive: true,
  });
  await writeFile(
    capsule.gitignoreFile.absolutePath,
    [
      "# CodeAI Hub workspace runtime capsule",
      "# Old rollback contract",
      "!runtime/settings/settings.json",
      "",
    ].join("\n"),
    "utf8"
  );

  const result = await bootstrapWorkspaceRuntimeCapsule({ workspaceRoot });

  assert.equal(
    await readFile(capsule.gitignoreFile.absolutePath, "utf8"),
    WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT
  );
  assert.equal(
    result.changedPaths.includes(capsule.gitignoreFile.relativePath),
    true
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
