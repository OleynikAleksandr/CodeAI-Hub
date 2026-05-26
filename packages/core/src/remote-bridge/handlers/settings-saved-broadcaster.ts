import type {
  LocalizationFacade,
  LocalizationRuntimePayload,
} from "@codeai-hub/localization";
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
    workspace?: WorkspaceSettingsScope,
    options: { readonly syncFailureMessage?: string | null } = {}
  ): Promise<void> {
    if (result.syncMode === "strict") {
      this.broadcastLocalizationSyncStatus({
        busy: true,
        message:
          "Localization sync is running. Project Manager and new sessions stay blocked until translated interface bundles are ready.",
      });
    }

    let localizationRuntime: LocalizationRuntimePayload | null = null;
    let syncFailureMessage = options.syncFailureMessage ?? null;

    if (!syncFailureMessage) {
      try {
        localizationRuntime =
          result.syncMode === "strict"
            ? await this.localizationFacade.synchronizeRuntimePayload(
                resolveLocalizationRuntimeSettings(result.settings),
                { affectedRuntimeBundleIds: result.affectedRuntimeBundleIds }
              )
            : await this.localizationFacade.resolveRuntimePayload(
                resolveLocalizationRuntimeSettings(result.settings)
              );
      } catch (error) {
        syncFailureMessage = toErrorMessage(error);
      }
    }

    this.broadcaster({
      type: "settings:saved",
      payload: {
        localizationRuntime,
        settings: result.settings,
        ...toWorkspaceScopePayload(workspace),
      },
    });

    if (result.syncMode === "strict" || syncFailureMessage) {
      this.broadcastLocalizationSyncStatus({
        busy: false,
        message: syncFailureMessage
          ? `Localization sync failed: ${syncFailureMessage}`
          : "Localization sync completed.",
      });
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
