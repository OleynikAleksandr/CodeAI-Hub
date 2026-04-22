import type { LocalizationFacade } from "@codeai-hub/localization";
import type { CoreConfig } from "../../config";
import type { Logger } from "../../telemetry/logger";
import { createCoreLocalizationFacade } from "../../translation/core-localization-facade-factory";
import type { BridgeEvent } from "../types";
import { SettingsLoadedBroadcaster } from "./settings-loaded-broadcaster";
import {
  SettingsPersistenceService,
  type SettingsWriteResult,
} from "./settings-persistence-service";
import { resolveLocalizationRuntimeSettings } from "./settings-persistence-snapshot";

export { resolveLocalizationRuntimeSettings } from "./settings-persistence-snapshot";

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export class SettingsRequestHandler {
  private readonly broadcaster: (event: BridgeEvent) => void;
  private readonly localizationFacade: LocalizationFacade;
  private readonly logger: Logger;
  private readonly settingsLoadedBroadcaster: SettingsLoadedBroadcaster;
  private readonly settingsPersistenceService: SettingsPersistenceService;

  constructor(options: {
    readonly broadcaster: (event: BridgeEvent) => void;
    readonly config: CoreConfig;
    readonly logger: Logger;
  }) {
    this.broadcaster = options.broadcaster;
    this.localizationFacade = createCoreLocalizationFacade({
      config: options.config,
    });
    this.logger = options.logger;
    this.settingsLoadedBroadcaster = new SettingsLoadedBroadcaster({
      broadcaster: options.broadcaster,
      localizationFacade: this.localizationFacade,
      resolveRuntimeSettings: resolveLocalizationRuntimeSettings,
    });
    this.settingsPersistenceService = new SettingsPersistenceService({
      config: options.config,
      logger: options.logger,
    });
  }

  async handleSave(settings: unknown): Promise<void> {
    try {
      await this.publishSaved(
        await this.settingsPersistenceService.save(settings)
      );
    } catch (error) {
      const reason = toErrorMessage(error);
      this.logger.warn("Failed to save settings", { error: reason });
      this.broadcastSaveError(reason);
    }
  }

  async handleReset(): Promise<void> {
    try {
      await this.publishSaved(await this.settingsPersistenceService.reset());
    } catch (error) {
      const reason = toErrorMessage(error);
      this.logger.warn("Failed to reset settings", { error: reason });
      this.broadcastSaveError(reason);
    }
  }

  async handleLoad(): Promise<void> {
    await this.settingsLoadedBroadcaster.publish(
      await this.settingsPersistenceService.load()
    );
  }

  handleLoadVersions(): void {
    this.broadcastVersionsError(
      "Core provider versions transport is not implemented yet."
    );
  }

  private broadcastLocalizationSyncStatus(payload: {
    readonly busy: boolean;
    readonly message: string;
  }): void {
    this.broadcaster({
      type: "settings:localization-sync-status",
      payload,
    });
  }

  private broadcastSaveError(error: string): void {
    this.broadcaster({ type: "settings:save-error", payload: { error } });
  }

  private broadcastVersionsError(error: string): void {
    this.broadcaster({
      type: "settings:versions",
      payload: { error, versions: undefined },
    });
  }

  handleUpdateProvider(
    _provider: "claude" | "codex" | "gemini",
    _target: "cli" | "core" | "sdk"
  ): void {
    this.broadcastVersionsError(
      "Core provider update transport is not implemented yet."
    );
  }

  private async publishSaved(result: SettingsWriteResult): Promise<void> {
    if (result.syncMode === "strict") {
      this.broadcastLocalizationSyncStatus({
        busy: true,
        message:
          "Localization sync is running. Project Manager and new sessions stay blocked until translated interface bundles are ready.",
      });
    }

    try {
      const localizationRuntime =
        result.syncMode === "strict"
          ? await this.localizationFacade.synchronizeRuntimePayload(
              resolveLocalizationRuntimeSettings(result.settings),
              { affectedRuntimeBundleIds: result.affectedRuntimeBundleIds }
            )
          : await this.localizationFacade.resolveRuntimePayload(
              resolveLocalizationRuntimeSettings(result.settings)
            );

      this.broadcaster({
        type: "settings:saved",
        payload: {
          localizationRuntime,
          settings: result.settings,
        },
      });

      if (result.syncMode === "strict") {
        this.broadcastLocalizationSyncStatus({
          busy: false,
          message: "Localization sync completed.",
        });
      }
    } catch (error) {
      if (result.syncMode === "strict") {
        this.broadcastLocalizationSyncStatus({
          busy: false,
          message: `Localization sync failed: ${toErrorMessage(error)}`,
        });
      }
      throw error;
    }
  }
}
