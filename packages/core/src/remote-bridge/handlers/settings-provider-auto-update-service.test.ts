import assert from "node:assert/strict";
import test from "node:test";
import type { CoreConfig } from "../../config";
import { buildDefaultSettingsSnapshot } from "./settings-persistence-snapshot";
import {
  resolveProviderAutoUpdateTargets,
  SettingsProviderAutoUpdateService,
} from "./settings-provider-auto-update-service";

const createLogger = () =>
  ({
    info: () => {
      // noop
    },
    warn: () => {
      // noop
    },
  }) as never;

const createConfig = (): CoreConfig => ({
  claudeContinuityRemainingPercentThreshold: 30,
  claudeDefaultModel: "sonnet",
  claudeProjectSlug: "default",
  claudeSettingsPath: "/tmp/codeai-hub-settings.json",
  codexSkipGitRepoCheck: false,
  continuityPreemptRemainingPercentThreshold: 50,
  host: "127.0.0.1",
  idleTtlMinutes: null,
  managedMode: null,
  port: 8080,
  shutdownGracePeriodMs: 0,
  templatesDir: "/tmp/codeai-hub-templates",
});

test("default settings snapshot does not schedule startup provider auto-updates", () => {
  assert.deepEqual(
    resolveProviderAutoUpdateTargets(
      buildDefaultSettingsSnapshot(createConfig())
    ),
    []
  );
});

test("resolveProviderAutoUpdateTargets maps enabled provider settings to startup update targets", () => {
  assert.deepEqual(
    resolveProviderAutoUpdateTargets({
      providers: {
        claude: { autoUpdate: { enabled: true } },
        codex: { autoUpdate: { enabled: false } },
        gemini: { autoUpdate: { enabled: true } },
      },
    }),
    [
      { provider: "claude", target: "cli" },
      { provider: "claude", target: "sdk" },
    ]
  );
});

test("SettingsProviderAutoUpdateService continues after a target update failure", async () => {
  const updates: string[] = [];
  const service = new SettingsProviderAutoUpdateService({
    config: {} as never,
    logger: createLogger(),
    settingsPersistenceService: {
      load: () =>
        Promise.resolve({
          providers: {
            claude: { autoUpdate: { enabled: true } },
          },
        }),
    },
    settingsProviderVersionService: {
      updateTarget: (provider, target) => {
        updates.push(`${provider}:${target}`);
        return target === "cli"
          ? Promise.reject(new Error("cli unavailable"))
          : Promise.resolve();
      },
    },
  });

  await service.runStartupAutoUpdate();

  assert.deepEqual(updates, ["claude:cli", "claude:sdk"]);
});

test("SettingsProviderAutoUpdateService waits for Codex CLI update before completing startup", async () => {
  const updates: string[] = [];
  let resolveCodexCliUpdate: () => void = () => {
    throw new Error("Codex CLI update resolver was not initialized");
  };
  const codexCliUpdated = new Promise<void>((resolve) => {
    resolveCodexCliUpdate = resolve;
  });
  const service = new SettingsProviderAutoUpdateService({
    config: {} as never,
    logger: createLogger(),
    settingsPersistenceService: {
      load: () =>
        Promise.resolve({
          providers: {
            codex: { autoUpdate: { enabled: true } },
          },
        }),
    },
    settingsProviderVersionService: {
      updateTarget: async (provider, target) => {
        updates.push(`${provider}:${target}:start`);
        if (provider === "codex" && target === "cli") {
          await codexCliUpdated;
        }
        updates.push(`${provider}:${target}:done`);
      },
    },
  });

  let startupCompleted = false;
  const startup = service.runStartupAutoUpdate().then(() => {
    startupCompleted = true;
  });
  await Promise.resolve();

  assert.equal(startupCompleted, false);
  assert.deepEqual(updates, ["codex:cli:start"]);

  resolveCodexCliUpdate();
  await startup;

  assert.equal(startupCompleted, true);
  assert.deepEqual(updates, [
    "codex:cli:start",
    "codex:cli:done",
    "codex:sdk:start",
    "codex:sdk:done",
  ]);
});
