import type {
  LocalizationFacade,
  LocalizationRuntimeSettingsSnapshot,
} from "@codeai-hub/localization";
import type { BridgeEvent } from "../types";

export class SettingsLoadedBroadcaster {
  private readonly broadcaster: (event: BridgeEvent) => void;
  private readonly localizationFacade: LocalizationFacade;
  private readonly resolveRuntimeSettings: (
    settings: Record<string, unknown>
  ) => LocalizationRuntimeSettingsSnapshot;

  constructor(options: {
    readonly broadcaster: (event: BridgeEvent) => void;
    readonly localizationFacade: LocalizationFacade;
    readonly resolveRuntimeSettings: (
      settings: Record<string, unknown>
    ) => LocalizationRuntimeSettingsSnapshot;
  }) {
    this.broadcaster = options.broadcaster;
    this.localizationFacade = options.localizationFacade;
    this.resolveRuntimeSettings = options.resolveRuntimeSettings;
  }

  async publish(settings: Record<string, unknown>): Promise<void> {
    this.broadcaster({
      type: "settings:loaded",
      payload: {
        localizationRuntime: null,
        settings,
        error: null,
      },
    });

    const localizationRuntime =
      await this.localizationFacade.resolveRuntimePayload(
        this.resolveRuntimeSettings(settings)
      );
    this.broadcaster({
      type: "settings:loaded",
      payload: {
        localizationRuntime,
        settings,
        error: null,
      },
    });
  }
}
