import type {
  LocalizationFacade,
  LocalizationRuntimeSettingsSnapshot,
} from "@codeai-hub/localization";
import type { BridgeEvent } from "../types";
import type { WorkspaceSettingsScope } from "./settings-persistence-snapshot";

export const toWorkspaceScopePayload = (
  workspace?: WorkspaceSettingsScope
): Record<string, string> =>
  workspace
    ? {
        workspacePath: workspace.workspaceRoot,
        workspaceSlug: workspace.workspaceSlug,
      }
    : {};

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

  async publish(
    settings: Record<string, unknown>,
    workspace?: WorkspaceSettingsScope
  ): Promise<void> {
    const scopePayload = toWorkspaceScopePayload(workspace);
    const availableEngines = this.localizationFacade.listAvailableEngines();
    this.broadcaster({
      type: "settings:loaded",
      payload: {
        availableEngines,
        localizationRuntime: null,
        settings,
        error: null,
        ...scopePayload,
      },
    });

    const localizationRuntime =
      await this.localizationFacade.resolveRuntimePayload(
        this.resolveRuntimeSettings(settings)
      );
    this.broadcaster({
      type: "settings:loaded",
      payload: {
        availableEngines: localizationRuntime.availableEngines,
        localizationRuntime,
        settings,
        error: null,
        ...scopePayload,
      },
    });
  }
}
