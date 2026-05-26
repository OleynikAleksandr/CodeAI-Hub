import type { LocalizationFacade } from "@codeai-hub/localization";
import type { BridgeEvent } from "../types";
import { toWorkspaceScopePayload } from "./settings-loaded-broadcaster";
import type { SettingsWriteResult } from "./settings-persistence-service";
import {
  resolveLocalizationRuntimeSettings,
  type WorkspaceSettingsScope,
} from "./settings-persistence-snapshot";

const toErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export class SettingsSavedBroadcaster {
  private readonly broadcaster: (event: BridgeEvent) => void;
  private readonly localizationFacade: LocalizationFacade;

  constructor(options: {
    readonly broadcaster: (event: BridgeEvent) => void;
    readonly localizationFacade: LocalizationFacade;
  }) {
    this.broadcaster = options.broadcaster;
    this.localizationFacade = options.localizationFacade;
  }

  async publish(
    result: SettingsWriteResult,
    workspace?: WorkspaceSettingsScope
  ): Promise<void> {
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
          ...toWorkspaceScopePayload(workspace),
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

  private broadcastLocalizationSyncStatus(payload: {
    readonly busy: boolean;
    readonly message: string;
  }): void {
    this.broadcaster({
      type: "settings:localization-sync-status",
      payload,
    });
  }
}
