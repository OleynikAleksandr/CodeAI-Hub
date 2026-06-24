import type { CoreConfig } from "../../config";
import type { Logger } from "../../telemetry/logger";
import { SettingsPersistenceService } from "./settings-persistence-service";
import { SettingsProviderVersionService } from "./settings-provider-version-service";

type ProviderId = "claude" | "codex";
type VersionTarget = "cli" | "sdk";

export interface ProviderAutoUpdateTarget {
  readonly provider: ProviderId;
  readonly target: VersionTarget;
}

interface SettingsPersistenceReader {
  load(): Promise<Record<string, unknown>>;
}

interface ProviderVersionUpdater {
  updateTarget(provider: ProviderId, target: VersionTarget): Promise<unknown>;
}

const PROVIDER_TARGETS: Readonly<Record<ProviderId, readonly VersionTarget[]>> =
  {
    claude: ["cli", "sdk"],
    codex: ["cli", "sdk"],
  };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isProviderAutoUpdateEnabled = (
  settings: Record<string, unknown>,
  provider: ProviderId
): boolean => {
  const providers = settings.providers;
  if (!isRecord(providers)) {
    return false;
  }
  const providerSettings = providers[provider];
  if (!isRecord(providerSettings)) {
    return false;
  }
  const autoUpdate = providerSettings.autoUpdate;
  return isRecord(autoUpdate) && autoUpdate.enabled === true;
};

const toError = (error: unknown): Error =>
  error instanceof Error ? error : new Error(String(error));

export const resolveProviderAutoUpdateTargets = (
  settings: Record<string, unknown>
): readonly ProviderAutoUpdateTarget[] =>
  (Object.keys(PROVIDER_TARGETS) as ProviderId[]).flatMap((provider) =>
    isProviderAutoUpdateEnabled(settings, provider)
      ? PROVIDER_TARGETS[provider].map((target) => ({ provider, target }))
      : []
  );

export class SettingsProviderAutoUpdateService {
  private readonly logger: Logger;
  private readonly settingsPersistenceService: SettingsPersistenceReader;
  private readonly settingsProviderVersionService: ProviderVersionUpdater;

  constructor(options: {
    readonly config: CoreConfig;
    readonly logger: Logger;
    readonly settingsPersistenceService?: SettingsPersistenceReader;
    readonly settingsProviderVersionService?: ProviderVersionUpdater;
  }) {
    this.logger = options.logger;
    this.settingsPersistenceService =
      options.settingsPersistenceService ??
      new SettingsPersistenceService({
        config: options.config,
        logger: options.logger,
      });
    this.settingsProviderVersionService =
      options.settingsProviderVersionService ??
      new SettingsProviderVersionService();
  }

  async runStartupAutoUpdate(): Promise<void> {
    let settings: Record<string, unknown>;
    try {
      settings = await this.settingsPersistenceService.load();
    } catch (error) {
      this.logger.warn(
        "Provider auto-update skipped: failed to load settings",
        {
          error: toError(error).message,
        }
      );
      return;
    }

    const targets = resolveProviderAutoUpdateTargets(settings);
    if (targets.length === 0) {
      this.logger.info("Provider auto-update skipped: no enabled providers");
      return;
    }

    for (const target of targets) {
      await this.updateTarget(target);
    }
  }

  private async updateTarget(target: ProviderAutoUpdateTarget): Promise<void> {
    try {
      this.logger.info("Provider auto-update started", {
        provider: target.provider,
        target: target.target,
      });
      await this.settingsProviderVersionService.updateTarget(
        target.provider,
        target.target
      );
      this.logger.info("Provider auto-update completed", {
        provider: target.provider,
        target: target.target,
      });
    } catch (error) {
      this.logger.warn("Provider auto-update failed", {
        ...target,
        error: toError(error).message,
      });
    }
  }
}
