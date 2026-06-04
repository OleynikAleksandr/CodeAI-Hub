import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { bootstrapWorkspaceRuntimeCapsule } from "../runtime/workspace-runtime-capsule";
import { WorkflowStepCommitFacade } from "./workflow-step-commit-facade";

const execFileAsync = promisify(execFile);
const WORKSPACE_SLUG = "demo-workspace";
const ACCEPTED_STEP_COMMIT_RE = /codeai-step: Description accepted/u;
const CAPSULE_FINAL_DESCRIPTION_RE =
  /\.codeai-hub\/demo-workspace\/description\/Final_Description\.md/u;
const CAPSULE_PROVIDER_SESSION_RE =
  /\.codeai-hub\/demo-workspace\/runtime\/providers\/codex\/home\/sessions\/2026\/05\/25\/native-session\.jsonl/u;
const CAPSULE_PROVIDER_LEGACY_SESSION_RE =
  /\.codeai-hub\/demo-workspace\/runtime\/providers\/codex\/home\/sessions\/2026\/05\/25\/legacy-session\.jsonl/u;
const CAPSULE_PROVIDER_CONFIG_RE =
  /\.codeai-hub\/demo-workspace\/runtime\/providers\/codex\/home\/config\.toml/u;
const CAPSULE_PROVIDER_SQLITE_RE =
  /\.codeai-hub\/demo-workspace\/runtime\/providers\/codex\/home\/logs_2\.sqlite/u;
const CAPSULE_PROVIDER_AUTH_RE =
  /\.codeai-hub\/demo-workspace\/runtime\/providers\/codex\/home\/auth\.json/u;
const CAPSULE_PROVIDER_CACHE_JSON_RE =
  /\.codeai-hub\/demo-workspace\/runtime\/providers\/codex\/home\/\.codex\/mcp-needs-auth-cache\.json/u;
const CAPSULE_PROVIDER_CACHES_RE =
  /\.codeai-hub\/demo-workspace\/runtime\/providers\/codex\/home\/Library\/Caches\/codex-cli-nodejs\/mcp-logs\/capture\.jsonl/u;
const CAPSULE_PROVIDER_SHELL_SNAPSHOT_RE =
  /\.codeai-hub\/demo-workspace\/runtime\/providers\/codex\/home\/shell_snapshots\/snapshot\.sh/u;
const CAPSULE_LOCALIZATION_CACHE_RE =
  /\.codeai-hub\/demo-workspace\/runtime\/localization\/cache\/browser-runtime-bootstrap\.json/u;
const CAPSULE_SETTINGS_RE =
  /\.codeai-hub\/demo-workspace\/runtime\/settings\/settings\.json/u;
const CAPSULE_TASK_TIMER_STATE_RE =
  /\.codeai-hub\/demo-workspace\/runtime\/state\/task-timers\.json/u;
const CAPSULE_UNIFIED_SESSION_RE =
  /\.codeai-hub\/demo-workspace\/runtime\/sessions\/unified\/codex\/dialog\.jsonl/u;
const RUNTIME_SLICES_RE = new RegExp(["runtime", "slices"].join("-"), "u");
const LOCAL_STATE_IGNORE_RE = /\.codeai-hub\/state\//u;
const LOCAL_STATE_TIMER_RE = /\.codeai-hub\/state\/task-timers\.json/u;

const writeText = async (filePath: string, content: string): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
};

const git = async (
  workspaceRoot: string,
  args: readonly string[]
): Promise<string> => {
  const { stdout } = await execFileAsync("git", args, { cwd: workspaceRoot });
  return stdout.trim();
};

test("accepted step commit tracks workspace capsule directly and leaves Git clean", async () => {
  const workspaceRoot = await mkdtemp(path.join(tmpdir(), "step-workspace-"));
  try {
    const { capsule } = await bootstrapWorkspaceRuntimeCapsule({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeText(
      path.join(capsule.descriptionRoot.absolutePath, "Final_Description.md"),
      "# Final Description\n"
    );
    await writeText(
      path.join(
        capsule.localizationRoot.absolutePath,
        "cache",
        "browser-runtime-bootstrap.json"
      ),
      '{"language":"ru"}\n'
    );
    await writeText(
      path.join(capsule.providerHomes.codex.absolutePath, "config.toml"),
      'model = "gpt-5.3-codex-spark"\n'
    );
    await writeText(
      path.join(
        capsule.providerHomes.codex.absolutePath,
        "sessions",
        "2026",
        "05",
        "25",
        "native-session.jsonl"
      ),
      "native session\n"
    );
    await writeText(
      path.join(
        capsule.unifiedSessionsRoot.absolutePath,
        "codex",
        "dialog.jsonl"
      ),
      "unified session\n"
    );
    await writeText(
      path.join(capsule.stateRoot.absolutePath, "task-timers.json"),
      "{}\n"
    );

    const result = await new WorkflowStepCommitFacade().commitAcceptedStep({
      sessions: [
        { providerId: "codexCli", providerSessionId: "provider-session-1" },
      ],
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(result.stage, "description");
    assert.equal(await git(workspaceRoot, ["status", "--porcelain"]), "");
    assert.match(
      await git(workspaceRoot, ["log", "--oneline", "-1"]),
      ACCEPTED_STEP_COMMIT_RE
    );
    assert.match(
      await readFile(path.join(workspaceRoot, ".gitignore"), "utf8"),
      LOCAL_STATE_IGNORE_RE
    );
    assert.equal(
      await readFile(
        path.join(
          capsule.providerHomes.codex.absolutePath,
          "sessions",
          "2026",
          "05",
          "25",
          "native-session.jsonl"
        ),
        "utf8"
      ),
      "native session\n"
    );
    const trackedFiles = await git(workspaceRoot, ["ls-files"]);
    assert.match(trackedFiles, CAPSULE_FINAL_DESCRIPTION_RE);
    assert.doesNotMatch(trackedFiles, CAPSULE_LOCALIZATION_CACHE_RE);
    assert.match(trackedFiles, CAPSULE_PROVIDER_CONFIG_RE);
    assert.match(trackedFiles, CAPSULE_PROVIDER_SESSION_RE);
    assert.match(trackedFiles, CAPSULE_TASK_TIMER_STATE_RE);
    assert.match(trackedFiles, CAPSULE_UNIFIED_SESSION_RE);
    assert.doesNotMatch(trackedFiles, RUNTIME_SLICES_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("accepted step commit ignores local CodeAI runtime state before clean-git gate", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "step-local-state-workspace-")
  );
  try {
    const { capsule } = await bootstrapWorkspaceRuntimeCapsule({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await writeText(
      path.join(capsule.descriptionRoot.absolutePath, "Final_Description.md"),
      "# Final Description\n"
    );
    await writeText(
      path.join(workspaceRoot, ".codeai-hub", "state", "task-timers.json"),
      "{}\n"
    );

    await new WorkflowStepCommitFacade().commitAcceptedStep({
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(await git(workspaceRoot, ["status", "--porcelain"]), "");
    assert.match(
      await readFile(path.join(workspaceRoot, ".gitignore"), "utf8"),
      LOCAL_STATE_IGNORE_RE
    );
    const trackedFiles = await git(workspaceRoot, ["ls-files"]);
    assert.doesNotMatch(trackedFiles, LOCAL_STATE_TIMER_RE);
    assert.match(
      await git(workspaceRoot, ["log", "--oneline", "-1"]),
      ACCEPTED_STEP_COMMIT_RE
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("legacy local CodeAI runtime state can be tracked before step acceptance", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "step-tracked-local-state-workspace-")
  );
  try {
    await git(workspaceRoot, ["init"]);
    await git(workspaceRoot, ["config", "user.email", "test@example.com"]);
    await git(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
    await writeText(
      path.join(workspaceRoot, ".codeai-hub", "state", "task-timers.json"),
      '{"schemaVersion":2,"totals":{"description":1}}\n'
    );
    await git(workspaceRoot, ["add", ".codeai-hub/state/task-timers.json"]);
    await git(workspaceRoot, ["commit", "-m", "test: old local runtime state"]);

    await writeText(
      path.join(workspaceRoot, ".codeai-hub", "state", "task-timers.json"),
      '{"schemaVersion":2,"totals":{"description":2}}\n'
    );

    assert.equal(
      await git(workspaceRoot, [
        "ls-files",
        "--",
        ".codeai-hub/state/task-timers.json",
      ]),
      ".codeai-hub/state/task-timers.json"
    );
    assert.equal(
      await git(workspaceRoot, ["status", "--short", "--untracked-files=all"]),
      "M .codeai-hub/state/task-timers.json"
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("accepted step commit untracks already tracked local CodeAI runtime state", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "step-untrack-local-state-workspace-")
  );
  try {
    const { capsule } = await bootstrapWorkspaceRuntimeCapsule({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await git(workspaceRoot, ["init"]);
    await git(workspaceRoot, ["config", "user.email", "test@example.com"]);
    await git(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
    await writeText(
      path.join(workspaceRoot, ".codeai-hub", "state", "task-timers.json"),
      '{"schemaVersion":2,"totals":{"description":1}}\n'
    );
    await git(workspaceRoot, ["add", ".codeai-hub/state/task-timers.json"]);
    await git(workspaceRoot, ["commit", "-m", "test: old local runtime state"]);
    await writeText(
      path.join(capsule.descriptionRoot.absolutePath, "Final_Description.md"),
      "# Final Description\n"
    );
    await writeText(
      path.join(workspaceRoot, ".codeai-hub", "state", "task-timers.json"),
      '{"schemaVersion":2,"totals":{"description":2}}\n'
    );

    await new WorkflowStepCommitFacade().commitAcceptedStep({
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(await git(workspaceRoot, ["status", "--porcelain"]), "");
    assert.equal(
      await git(workspaceRoot, [
        "ls-files",
        "--",
        ".codeai-hub/state/task-timers.json",
      ]),
      ""
    );
    assert.equal(
      await readFile(
        path.join(workspaceRoot, ".codeai-hub", "state", "task-timers.json"),
        "utf8"
      ),
      '{"schemaVersion":2,"totals":{"description":2}}\n'
    );
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("accepted step commit untracks provider secrets and caches left by older capsule commits", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "step-volatile-workspace-")
  );
  try {
    const { capsule } = await bootstrapWorkspaceRuntimeCapsule({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await git(workspaceRoot, ["init"]);
    await git(workspaceRoot, ["config", "user.email", "test@example.com"]);
    await git(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
    const volatileSqlitePath = path.join(
      capsule.providerHomes.codex.absolutePath,
      "logs_2.sqlite"
    );
    const volatileAuthPath = path.join(
      capsule.providerHomes.codex.absolutePath,
      "auth.json"
    );
    const volatileShellSnapshotPath = path.join(
      capsule.providerHomes.codex.absolutePath,
      "shell_snapshots",
      "snapshot.sh"
    );
    const volatileCachesPath = path.join(
      capsule.providerHomes.codex.absolutePath,
      "Library",
      "Caches",
      "codex-cli-nodejs",
      "mcp-logs",
      "capture.jsonl"
    );
    const volatileCacheJsonPath = path.join(
      capsule.providerHomes.codex.absolutePath,
      ".codex",
      "mcp-needs-auth-cache.json"
    );
    await writeText(volatileSqlitePath, "old logs\n");
    await writeText(volatileAuthPath, '{"token":"old"}\n');
    await writeText(volatileShellSnapshotPath, "old snapshot\n");
    await writeText(volatileCachesPath, "old cache log\n");
    await writeText(volatileCacheJsonPath, '{"cache":"old"}\n');
    await git(workspaceRoot, ["add", "."]);
    await git(workspaceRoot, [
      "add",
      "-f",
      path.relative(workspaceRoot, volatileSqlitePath),
      path.relative(workspaceRoot, volatileAuthPath),
      path.relative(workspaceRoot, volatileShellSnapshotPath),
      path.relative(workspaceRoot, volatileCachesPath),
      path.relative(workspaceRoot, volatileCacheJsonPath),
    ]);
    await git(workspaceRoot, ["commit", "-m", "test: old capsule commit"]);

    await writeText(
      path.join(capsule.descriptionRoot.absolutePath, "Final_Description.md"),
      "# Final Description\n"
    );
    await writeText(volatileSqlitePath, "new logs\n");
    await writeText(volatileAuthPath, '{"token":"new"}\n');
    await writeText(volatileShellSnapshotPath, "new snapshot\n");
    await writeText(volatileCachesPath, "new cache log\n");
    await writeText(volatileCacheJsonPath, '{"cache":"new"}\n');

    await new WorkflowStepCommitFacade().commitAcceptedStep({
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(await git(workspaceRoot, ["status", "--porcelain"]), "");
    const trackedFiles = await git(workspaceRoot, ["ls-files"]);
    assert.doesNotMatch(trackedFiles, CAPSULE_PROVIDER_SQLITE_RE);
    assert.doesNotMatch(trackedFiles, CAPSULE_PROVIDER_AUTH_RE);
    assert.doesNotMatch(trackedFiles, CAPSULE_PROVIDER_CACHE_JSON_RE);
    assert.doesNotMatch(trackedFiles, CAPSULE_PROVIDER_CACHES_RE);
    assert.match(trackedFiles, CAPSULE_PROVIDER_SHELL_SNAPSHOT_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});

test("accepted step commit preserves Git-owned provider session history while ignoring settings", async () => {
  const workspaceRoot = await mkdtemp(
    path.join(tmpdir(), "step-settings-workspace-")
  );
  try {
    const { capsule } = await bootstrapWorkspaceRuntimeCapsule({
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });
    await git(workspaceRoot, ["init"]);
    await git(workspaceRoot, ["config", "user.email", "test@example.com"]);
    await git(workspaceRoot, ["config", "user.name", "CodeAI Test"]);
    const localizationCachePath = path.join(
      capsule.localizationRoot.absolutePath,
      "cache",
      "browser-runtime-bootstrap.json"
    );
    const providerSessionPath = path.join(
      capsule.providerHomes.codex.absolutePath,
      "sessions",
      "2026",
      "05",
      "25",
      "legacy-session.jsonl"
    );
    const providerConfigPath = path.join(
      capsule.providerHomes.codex.absolutePath,
      "config.toml"
    );
    await writeText(localizationCachePath, '{"language":"en"}\n');
    await writeText(providerSessionPath, "legacy native session\n");
    await writeText(providerConfigPath, 'model = "legacy"\n');
    await git(workspaceRoot, [
      "add",
      "-f",
      capsule.settingsFile.relativePath,
      path.relative(workspaceRoot, localizationCachePath),
      path.relative(workspaceRoot, providerSessionPath),
      path.relative(workspaceRoot, providerConfigPath),
    ]);
    await git(workspaceRoot, [
      "commit",
      "-m",
      "test: legacy tracked mutable runtime",
    ]);

    const currentSettings = `${JSON.stringify(
      { general: { localization: { defaultLanguage: "ru" } } },
      null,
      2
    )}\n`;
    await writeText(capsule.settingsFile.absolutePath, currentSettings);
    await writeText(localizationCachePath, '{"language":"ru"}\n');
    await writeText(providerSessionPath, "current native session\n");
    await writeText(providerConfigPath, 'model = "current"\n');
    await writeText(
      path.join(capsule.descriptionRoot.absolutePath, "Final_Description.md"),
      "# Final Description\n"
    );

    await new WorkflowStepCommitFacade().commitAcceptedStep({
      stage: "description",
      workspaceRoot,
      workspaceSlug: WORKSPACE_SLUG,
    });

    assert.equal(
      await readFile(capsule.settingsFile.absolutePath, "utf8"),
      currentSettings
    );
    assert.equal(
      await readFile(localizationCachePath, "utf8"),
      '{"language":"ru"}\n'
    );
    assert.equal(
      await readFile(providerSessionPath, "utf8"),
      "current native session\n"
    );
    assert.equal(
      await readFile(providerConfigPath, "utf8"),
      'model = "current"\n'
    );
    assert.equal(await git(workspaceRoot, ["status", "--porcelain"]), "");
    const trackedFiles = await git(workspaceRoot, ["ls-files"]);
    assert.doesNotMatch(trackedFiles, CAPSULE_SETTINGS_RE);
    assert.doesNotMatch(trackedFiles, CAPSULE_LOCALIZATION_CACHE_RE);
    assert.match(trackedFiles, CAPSULE_PROVIDER_CONFIG_RE);
    assert.match(trackedFiles, CAPSULE_PROVIDER_LEGACY_SESSION_RE);
    assert.match(
      await git(workspaceRoot, ["log", "--oneline", "-1"]),
      ACCEPTED_STEP_COMMIT_RE
    );
    const headTreeFiles = await git(workspaceRoot, [
      "ls-tree",
      "-r",
      "--name-only",
      "HEAD",
    ]);
    assert.doesNotMatch(headTreeFiles, CAPSULE_SETTINGS_RE);
    assert.doesNotMatch(headTreeFiles, CAPSULE_LOCALIZATION_CACHE_RE);
    assert.match(headTreeFiles, CAPSULE_PROVIDER_CONFIG_RE);
    assert.match(headTreeFiles, CAPSULE_PROVIDER_LEGACY_SESSION_RE);
  } finally {
    await rm(workspaceRoot, { force: true, recursive: true });
  }
});
