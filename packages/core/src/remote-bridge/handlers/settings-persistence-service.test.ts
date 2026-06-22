import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { CoreConfig } from "../../config";
import type { Logger } from "../../telemetry/logger";
import { resolveWorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";
import { SettingsPersistenceService } from "./settings-persistence-service";
import { buildDefaultSettingsSnapshot } from "./settings-persistence-snapshot";

const createConfig = (settingsPath: string): CoreConfig => ({
  claudeContinuityRemainingPercentThreshold: 30,
  claudeDefaultModel: "sonnet",
  claudeProjectSlug: "default-workspace",
  claudeSettingsPath: settingsPath,
  codexSkipGitRepoCheck: false,
  continuityPreemptRemainingPercentThreshold: 50,
  geminiDefaultModel: "gemini-3-pro-preview",
  geminiSettingsPath: settingsPath,
  geminiThinkingLevelByModel: {},
  globalSettingsPath: settingsPath,
  host: "127.0.0.1",
  idleTtlMinutes: null,
  managedMode: null,
  port: 8080,
  shutdownGracePeriodMs: 0,
  templatesDir: "/tmp/templates",
});

const logger = {
  warn() {
    return undefined;
  },
} as unknown as Logger;

const WORKSPACE_SETTINGS_SCOPE_REQUIRED =
  /Workspace settings scope is required/;

const cloneSettings = (
  settings: Record<string, unknown>
): Record<string, unknown> =>
  JSON.parse(JSON.stringify(settings)) as Record<string, unknown>;

const setCodexDefaultModel = (
  settings: Record<string, unknown>,
  model: string
): Record<string, unknown> => {
  const next = cloneSettings(settings);
  const providers = next.providers as Record<string, unknown>;
  const codex = providers.codex as Record<string, unknown>;
  codex.defaultModel = model;
  return next;
};

const readCodexDefaultModel = (settings: Record<string, unknown>): string => {
  const providers = settings.providers as Record<string, unknown>;
  const codex = providers.codex as Record<string, unknown>;
  return String(codex.defaultModel);
};

const readCodexReasoningByModel = (
  settings: Record<string, unknown>
): Record<string, unknown> => {
  const providers = settings.providers as Record<string, unknown>;
  const codex = providers.codex as Record<string, unknown>;
  return codex.reasoningByModel as Record<string, unknown>;
};

const readGlmNativeSettings = (
  settings: Record<string, unknown>
): Record<string, unknown> => {
  const providers = settings.providers as Record<string, unknown>;
  return providers.glmNative as Record<string, unknown>;
};

const readKimiSettings = (
  settings: Record<string, unknown>
): Record<string, unknown> => {
  const providers = settings.providers as Record<string, unknown>;
  return providers.kimi as Record<string, unknown>;
};

const hasGeneralSettings = (settings: Record<string, unknown>): boolean =>
  typeof settings.general === "object" && settings.general !== null;

test("SettingsPersistenceService seeds workspace settings from existing workspace settings and isolates changes", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "codeai-settings-"));
  const globalSettingsPath = path.join(tempRoot, "global", "settings.json");
  const config = createConfig(globalSettingsPath);
  const workspaceA = {
    workspaceRoot: path.join(tempRoot, "workspace-a"),
    workspaceSlug: "workspace-a",
  };
  const workspaceB = {
    workspaceRoot: path.join(tempRoot, "workspace-b"),
    workspaceSlug: "workspace-b",
  };
  const service = new SettingsPersistenceService({
    config,
    listWorkspaceSettingsSeeds: () => [
      { ...workspaceA, lastUsed: "2026-05-25T12:00:00.000Z" },
      { ...workspaceB, lastUsed: "2026-05-25T13:00:00.000Z" },
    ],
    logger,
  });

  const loadedA = await service.load({ workspace: workspaceA });
  assert.equal(readCodexDefaultModel(loadedA), "gpt-5.4-mini");

  await service.save(setCodexDefaultModel(loadedA, "workspace-a-model"), {
    workspace: workspaceA,
  });

  const reloadedA = await service.load({ workspace: workspaceA });
  const loadedB = await service.load({ workspace: workspaceB });
  assert.equal(readCodexDefaultModel(reloadedA), "workspace-a-model");
  assert.equal(readCodexDefaultModel(loadedB), "workspace-a-model");

  const capsuleA = resolveWorkspaceRuntimeCapsule(workspaceA);
  const capsuleB = resolveWorkspaceRuntimeCapsule(workspaceB);
  assert.equal(
    capsuleA.settingsFile.relativePath,
    ".codeai-hub/workspace-a/runtime/settings/settings.json"
  );
  assert.equal(
    capsuleB.settingsFile.relativePath,
    ".codeai-hub/workspace-b/runtime/settings/settings.json"
  );
  const globalSettings = JSON.parse(
    await readFile(globalSettingsPath, "utf8")
  ) as Record<string, unknown>;
  assert.equal(hasGeneralSettings(globalSettings), true);

  const persistedWorkspaceA = JSON.parse(
    await readFile(capsuleA.settingsFile.absolutePath, "utf8")
  ) as Record<string, unknown>;
  const persistedWorkspaceB = JSON.parse(
    await readFile(capsuleB.settingsFile.absolutePath, "utf8")
  ) as Record<string, unknown>;
  assert.equal(hasGeneralSettings(persistedWorkspaceA), false);
  assert.equal(hasGeneralSettings(persistedWorkspaceB), false);
  assert.equal(readCodexDefaultModel(persistedWorkspaceA), "workspace-a-model");
  assert.equal(readCodexDefaultModel(persistedWorkspaceB), "workspace-a-model");
});

test("SettingsPersistenceService rejects unscoped writes and can seed global general settings", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "codeai-settings-"));
  const globalSettingsPath = path.join(tempRoot, "global", "settings.json");
  const config = createConfig(globalSettingsPath);
  const service = new SettingsPersistenceService({ config, logger });

  await assert.rejects(
    service.save(buildDefaultSettingsSnapshot(config)),
    WORKSPACE_SETTINGS_SCOPE_REQUIRED
  );
  await assert.rejects(service.reset(), WORKSPACE_SETTINGS_SCOPE_REQUIRED);
  assert.equal(readCodexDefaultModel(await service.load()), "gpt-5.4-mini");
  const globalSettings = JSON.parse(
    await readFile(globalSettingsPath, "utf8")
  ) as Record<string, unknown>;
  assert.equal(hasGeneralSettings(globalSettings), true);
});

test("SettingsPersistenceService keeps GLM native connection settings global", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "codeai-settings-"));
  const globalSettingsPath = path.join(tempRoot, "global", "settings.json");
  const config = createConfig(globalSettingsPath);
  const workspaceA = {
    workspaceRoot: path.join(tempRoot, "workspace-a"),
    workspaceSlug: "workspace-a",
  };
  const workspaceB = {
    workspaceRoot: path.join(tempRoot, "workspace-b"),
    workspaceSlug: "workspace-b",
  };
  const service = new SettingsPersistenceService({ config, logger });
  const settings = cloneSettings(await service.load({ workspace: workspaceA }));
  const glmNative = readGlmNativeSettings(settings);
  glmNative.apiKey = "zai-global-key";
  glmNative.baseUrl = "https://custom.z.ai/api/coding/paas/v4";
  glmNative.reasoningEffort = "high";

  await service.save(settings, { workspace: workspaceA });

  const globalSettings = JSON.parse(
    await readFile(globalSettingsPath, "utf8")
  ) as Record<string, unknown>;
  assert.deepEqual(readGlmNativeSettings(globalSettings), {
    apiKey: "zai-global-key",
    baseUrl: "https://custom.z.ai/api/coding/paas/v4",
  });

  const persistedWorkspaceA = JSON.parse(
    await readFile(
      resolveWorkspaceRuntimeCapsule(workspaceA).settingsFile.absolutePath,
      "utf8"
    )
  ) as Record<string, unknown>;
  assert.equal(readGlmNativeSettings(persistedWorkspaceA).apiKey, undefined);
  assert.equal(readGlmNativeSettings(persistedWorkspaceA).baseUrl, undefined);
  assert.equal(
    readGlmNativeSettings(persistedWorkspaceA).reasoningEffort,
    "high"
  );

  const loadedB = await service.load({ workspace: workspaceB });
  assert.equal(readGlmNativeSettings(loadedB).apiKey, "zai-global-key");
  assert.equal(
    readGlmNativeSettings(loadedB).baseUrl,
    "https://custom.z.ai/api/coding/paas/v4"
  );
});

test("SettingsPersistenceService keeps start-card provider defaults workspace scoped", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "codeai-settings-"));
  const globalSettingsPath = path.join(tempRoot, "global", "settings.json");
  const config = createConfig(globalSettingsPath);
  const workspace = {
    workspaceRoot: path.join(tempRoot, "workspace-a"),
    workspaceSlug: "workspace-a",
  };
  const service = new SettingsPersistenceService({ config, logger });
  const settings = cloneSettings(await service.load({ workspace }));
  const glmNative = readGlmNativeSettings(settings);
  const kimi = readKimiSettings(settings);
  glmNative.apiKey = "zai-global-key";
  glmNative.baseUrl = "https://custom.z.ai/api/coding/paas/v4";
  glmNative.reasoningEffort = "high";
  glmNative.thinkingEnabled = false;
  kimi.thinkingEnabled = false;

  await service.save(settings, { workspace });

  const globalSettings = JSON.parse(
    await readFile(globalSettingsPath, "utf8")
  ) as Record<string, unknown>;
  assert.deepEqual(readGlmNativeSettings(globalSettings), {
    apiKey: "zai-global-key",
    baseUrl: "https://custom.z.ai/api/coding/paas/v4",
  });
  assert.equal(readKimiSettings(globalSettings), undefined);

  const workspaceSettings = JSON.parse(
    await readFile(
      resolveWorkspaceRuntimeCapsule(workspace).settingsFile.absolutePath,
      "utf8"
    )
  ) as Record<string, unknown>;
  assert.equal(readGlmNativeSettings(workspaceSettings).apiKey, undefined);
  assert.equal(readGlmNativeSettings(workspaceSettings).baseUrl, undefined);
  assert.equal(
    readGlmNativeSettings(workspaceSettings).reasoningEffort,
    "high"
  );
  assert.equal(readGlmNativeSettings(workspaceSettings).thinkingEnabled, false);
  assert.equal(readKimiSettings(workspaceSettings).thinkingEnabled, false);
});

test("SettingsPersistenceService migrates unsupported Codex model settings", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "codeai-settings-"));
  const globalSettingsPath = path.join(tempRoot, "global", "settings.json");
  const config = createConfig(globalSettingsPath);
  const workspace = {
    workspaceRoot: path.join(tempRoot, "workspace-a"),
    workspaceSlug: "workspace-a",
  };
  const service = new SettingsPersistenceService({ config, logger });

  const staleSettings = buildDefaultSettingsSnapshot(config);
  const providers = staleSettings.providers as Record<string, unknown>;
  const codex = providers.codex as Record<string, unknown>;
  codex.defaultModel = "gpt-5.3-codex";
  codex.reasoningByModel = {
    ...(codex.reasoningByModel as Record<string, unknown>),
    "gpt-5.3-codex": "xhigh",
  };

  await service.save(staleSettings, { workspace });

  const loaded = await service.load({ workspace });
  assert.equal(readCodexDefaultModel(loaded), "gpt-5.4-mini");
  assert.equal(
    Object.hasOwn(readCodexReasoningByModel(loaded), "gpt-5.3-codex"),
    false
  );

  const persistedWorkspace = JSON.parse(
    await readFile(
      resolveWorkspaceRuntimeCapsule(workspace).settingsFile.absolutePath,
      "utf8"
    )
  ) as Record<string, unknown>;
  assert.equal(readCodexDefaultModel(persistedWorkspace), "gpt-5.4-mini");
  assert.equal(
    Object.hasOwn(
      readCodexReasoningByModel(persistedWorkspace),
      "gpt-5.3-codex"
    ),
    false
  );
});
