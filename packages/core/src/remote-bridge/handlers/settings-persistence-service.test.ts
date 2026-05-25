import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import type { CoreConfig } from "../../config";
import type { Logger } from "../../telemetry/logger";
import { resolveWorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";
import { SettingsPersistenceService } from "./settings-persistence-service";
import {
  buildDefaultSettingsSnapshot,
  persistSettingsSnapshot,
} from "./settings-persistence-snapshot";

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

test("SettingsPersistenceService seeds workspace settings from global defaults and isolates changes", async () => {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "codeai-settings-"));
  const globalSettingsPath = path.join(tempRoot, "global", "settings.json");
  const config = createConfig(globalSettingsPath);
  const seedSettings = setCodexDefaultModel(
    buildDefaultSettingsSnapshot(config),
    "seed-codex-model"
  );
  await persistSettingsSnapshot(globalSettingsPath, seedSettings);

  const service = new SettingsPersistenceService({ config, logger });
  const workspaceA = {
    workspaceRoot: path.join(tempRoot, "workspace-a"),
    workspaceSlug: "workspace-a",
  };
  const workspaceB = {
    workspaceRoot: path.join(tempRoot, "workspace-b"),
    workspaceSlug: "workspace-b",
  };

  const loadedA = await service.load({ workspace: workspaceA });
  assert.equal(readCodexDefaultModel(loadedA), "seed-codex-model");

  await service.save(setCodexDefaultModel(loadedA, "workspace-a-model"), {
    workspace: workspaceA,
  });

  const reloadedA = await service.load({ workspace: workspaceA });
  const loadedB = await service.load({ workspace: workspaceB });
  assert.equal(readCodexDefaultModel(reloadedA), "workspace-a-model");
  assert.equal(readCodexDefaultModel(loadedB), "seed-codex-model");

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
  assert.equal(
    readCodexDefaultModel(
      JSON.parse(await readFile(globalSettingsPath, "utf8"))
    ),
    "seed-codex-model"
  );
  assert.equal(
    readCodexDefaultModel(
      JSON.parse(await readFile(capsuleA.settingsFile.absolutePath, "utf8"))
    ),
    "workspace-a-model"
  );
  assert.equal(
    readCodexDefaultModel(
      JSON.parse(await readFile(capsuleB.settingsFile.absolutePath, "utf8"))
    ),
    "seed-codex-model"
  );
});
