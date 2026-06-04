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
const gitignoreLines = WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT.split("\n");

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

test("workspace runtime gitignore keeps workflow sessions trackable", () => {
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
  assert.equal(gitignoreLines.includes("runtime/providers/**/home/"), false);
  assert.equal(gitignoreLines.includes("runtime/sessions/unified/*/"), false);
  assert.equal(gitignoreLines.includes("!runtime/sessions/unified/"), true);
  assert.equal(gitignoreLines.includes("!runtime/providers/**/home/"), true);
  assert.equal(
    WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT.includes("runtime/**/tmp/"),
    false
  );
});

test("workspace runtime gitignore tracks provider-native session histories", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "codeai-provider-native-gitignore-")
  );
  const capsule = resolveWorkspaceRuntimeCapsule({ workspaceRoot });
  await bootstrapWorkspaceRuntimeCapsule({ workspaceRoot });

  const trackedSessionPaths = [
    path.posix.join(
      capsule.providerHomes.codex.relativePath,
      "sessions",
      "2026",
      "06",
      "04",
      "rollout-codex.jsonl"
    ),
    path.posix.join(
      capsule.providerHomes.claude.relativePath,
      ".claude",
      "projects",
      "finderwidget-test01",
      "claude-session.jsonl"
    ),
    path.posix.join(
      capsule.providerHomes["glm-claude-code"].relativePath,
      ".claude",
      "projects",
      "finderwidget-test01",
      "glm-session.jsonl"
    ),
    path.posix.join(
      capsule.providerHomes.gemini.relativePath,
      ".gemini",
      "tmp",
      "finderwidget-test01",
      "chats",
      "session-gemini.jsonl"
    ),
    path.posix.join(capsule.providerHomes.kimi.relativePath, "wire.jsonl"),
  ];
  const ignoredProviderTmpPath = path.posix.join(
    capsule.providerHomes.codex.relativePath,
    "tmp",
    "arg0",
    "scratch.lock"
  );
  const ignoredGeminiAuthPath = path.posix.join(
    capsule.providerHomes.gemini.relativePath,
    ".gemini",
    "oauth_creds.json"
  );

  for (const relativePath of [
    ...trackedSessionPaths,
    ignoredProviderTmpPath,
    ignoredGeminiAuthPath,
  ]) {
    await mkdir(path.dirname(path.join(workspaceRoot, relativePath)), {
      recursive: true,
    });
    await writeFile(path.join(workspaceRoot, relativePath), "{}\n", "utf8");
  }
  await git(workspaceRoot, ["init"]);

  const status = await git(workspaceRoot, [
    "status",
    "--short",
    "--untracked-files=all",
  ]);
  const statusPaths = status
    .split("\n")
    .filter(Boolean)
    .map((line) => line.slice(3));

  for (const relativePath of trackedSessionPaths) {
    assert.equal(
      statusPaths.includes(relativePath),
      true,
      `${relativePath} must stay visible to Git`
    );
  }
  assert.equal(statusPaths.includes(ignoredProviderTmpPath), false);
  assert.equal(statusPaths.includes(ignoredGeminiAuthPath), false);
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
    false
  );
  assert.equal(
    isWorkspaceRollbackIgnoredRuntimePath({
      capsule,
      relativePath:
        ".codeai-hub/codeai-hub-codex-5-4/runtime/providers/codex/home/skills/.system/imagegen/SKILL.md",
    }),
    false
  );
  assert.equal(
    isWorkspaceRollbackIgnoredRuntimePath({
      capsule,
      relativePath:
        ".codeai-hub/codeai-hub-codex-5-4/runtime/providers/codex/home/sessions/2026/05/26/session.jsonl",
    }),
    false
  );
  assert.equal(
    isWorkspaceRollbackIgnoredRuntimePath({
      capsule,
      relativePath:
        ".codeai-hub/codeai-hub-codex-5-4/runtime/sessions/unified/glmClaudeCode/glmclaudecode-description.jsonl",
    }),
    false
  );
  assert.equal(
    isWorkspaceRollbackIgnoredRuntimePath({
      capsule,
      relativePath:
        ".codeai-hub/codeai-hub-codex-5-4/runtime/sessions/unified/glmClaudeCode/glmclaudecode-description.translations.jsonl",
    }),
    false
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

test("workspace rollback ignore untracks only live settings and localization files", async () => {
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
  ];
  const rollbackOwnedPaths = [
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
    path.posix.join(
      capsule.unifiedSessionsRoot.relativePath,
      "glmClaudeCode",
      "glmclaudecode-description.jsonl"
    ),
    path.posix.join(
      capsule.unifiedSessionsRoot.relativePath,
      "glmClaudeCode",
      "glmclaudecode-description.translations.jsonl"
    ),
  ];
  const rollbackOwnedSessionIndexPath = path.posix.join(
    capsule.unifiedSessionsRoot.relativePath,
    "session.json"
  );
  for (const relativePath of [
    ...trackedMutablePaths,
    ...rollbackOwnedPaths,
    rollbackOwnedSessionIndexPath,
  ]) {
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
  for (const relativePath of [
    ...rollbackOwnedPaths,
    rollbackOwnedSessionIndexPath,
  ]) {
    assert.equal(tracked.includes(relativePath), true);
  }
  assert.deepEqual(
    filterWorkspaceRollbackIgnoredGitStatusEntries({
      capsule,
      entries: [
        ` M ${trackedMutablePaths[0]}`,
        `?? ${trackedMutablePaths[1]}`,
        `?? ${rollbackOwnedPaths[0]}`,
        ` M ${rollbackOwnedSessionIndexPath}`,
      ],
    }),
    [`?? ${rollbackOwnedPaths[0]}`, ` M ${rollbackOwnedSessionIndexPath}`]
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
    WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT.includes(
      "runtime/providers/**/home/**/Caches/"
    ),
    true
  );
  assert.equal(
    WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT.includes(
      "runtime/providers/**/home/**/*-cache.json"
    ),
    true
  );
  assert.equal(
    WORKSPACE_RUNTIME_CAPSULE_GITIGNORE_CONTENT.endsWith("\n"),
    true
  );
});
