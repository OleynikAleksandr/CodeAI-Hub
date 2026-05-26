import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import {
  bootstrapWorkspaceRuntimeCapsule,
  resolveWorkspaceRuntimeCapsule,
} from "./workspace-runtime-capsule";
import {
  buildWorkspaceRuntimeCapsuleGitignore,
  WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT,
} from "./workspace-runtime-capsule-gitignore";
import {
  filterWorkspaceRollbackIgnoredGitStatusEntries,
  isWorkspaceRollbackIgnoredRuntimePath,
  untrackWorkspaceRollbackIgnoredRuntimePaths,
} from "./workspace-settings-rollback-ignore";

const execFileAsync = promisify(execFile);

const git = async (cwd: string, args: readonly string[]): Promise<string> => {
  const { stdout } = await execFileAsync("git", args, { cwd });
  return stdout.trim();
};

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
      "runtime/localization/"
    ),
    true
  );
  assert.equal(
    WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT.includes(
      "runtime/providers/**/home/"
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

test("workspace rollback ignore classifies mutable runtime paths", () => {
  const capsule = resolveWorkspaceRuntimeCapsule({
    workspaceRoot: "/tmp/CodeAI-Hub codex 5.4",
  });

  assert.equal(
    isWorkspaceRollbackIgnoredRuntimePath({
      capsule,
      relativePath:
        ".codeai-hub/codeai-hub-codex-5-4/runtime/settings/settings.json",
    }),
    true
  );
  assert.equal(
    isWorkspaceRollbackIgnoredRuntimePath({
      capsule,
      relativePath:
        ".codeai-hub/codeai-hub-codex-5-4/runtime/localization/cache/browser-runtime-bootstrap.json",
    }),
    true
  );
  assert.equal(
    isWorkspaceRollbackIgnoredRuntimePath({
      capsule,
      relativePath:
        ".codeai-hub/codeai-hub-codex-5-4/runtime/providers/codex/home/config.toml",
    }),
    true
  );
  assert.equal(
    isWorkspaceRollbackIgnoredRuntimePath({
      capsule,
      relativePath:
        ".codeai-hub/codeai-hub-codex-5-4/runtime/providers/codex/home/skills/.system/imagegen/SKILL.md",
    }),
    true
  );
  assert.equal(
    isWorkspaceRollbackIgnoredRuntimePath({
      capsule,
      relativePath:
        ".codeai-hub/codeai-hub-codex-5-4/runtime/providers/codex/home/sessions/2026/05/26/session.jsonl",
    }),
    true
  );
  assert.equal(
    isWorkspaceRollbackIgnoredRuntimePath({
      capsule,
      relativePath:
        ".codeai-hub/codeai-hub-codex-5-4/runtime/sessions/unified/session.json",
    }),
    false
  );
});

test("workspace rollback ignore untracks legacy mutable runtime files", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "codeai-runtime-untrack-")
  );
  const capsule = resolveWorkspaceRuntimeCapsule({ workspaceRoot });
  const trackedMutablePaths = [
    capsule.settingsFile.relativePath,
    path.posix.join(
      capsule.localizationRoot.relativePath,
      "cache",
      "browser-runtime-bootstrap.json"
    ),
    path.posix.join(capsule.providerHomes.codex.relativePath, "config.toml"),
    path.posix.join(
      capsule.providerHomes.codex.relativePath,
      "skills",
      ".system",
      "imagegen",
      "SKILL.md"
    ),
    path.posix.join(
      capsule.providerHomes.codex.relativePath,
      "sessions",
      "2026",
      "05",
      "26",
      "session.jsonl"
    ),
  ];
  const rollbackOwnedPath = path.posix.join(
    capsule.unifiedSessionsRoot.relativePath,
    "session.json"
  );
  for (const relativePath of [...trackedMutablePaths, rollbackOwnedPath]) {
    await mkdir(path.dirname(path.join(workspaceRoot, relativePath)), {
      recursive: true,
    });
    await writeFile(path.join(workspaceRoot, relativePath), "{}\n", "utf8");
  }
  await git(workspaceRoot, ["init"]);
  await git(workspaceRoot, ["config", "user.email", "test@example.local"]);
  await git(workspaceRoot, ["config", "user.name", "Test"]);
  await git(workspaceRoot, ["add", "-A", ".codeai-hub"]);
  await git(workspaceRoot, ["commit", "-m", "seed"]);

  await untrackWorkspaceRollbackIgnoredRuntimePaths({
    capsule,
    workspaceRoot,
  });

  const tracked = (await git(workspaceRoot, ["ls-files"])).split("\n");
  for (const relativePath of trackedMutablePaths) {
    assert.equal(tracked.includes(relativePath), false);
  }
  assert.equal(tracked.includes(rollbackOwnedPath), true);
  assert.deepEqual(
    filterWorkspaceRollbackIgnoredGitStatusEntries({
      capsule,
      entries: [
        ` M ${trackedMutablePaths[0]}`,
        `?? ${trackedMutablePaths[1]}`,
        `?? ${trackedMutablePaths[2]}`,
        ` M ${rollbackOwnedPath}`,
      ],
    }),
    [` M ${rollbackOwnedPath}`]
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
