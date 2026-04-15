import {
  LocalizationFacade,
  type LocalizationRuntimeBootstrapSnapshot,
  type LocalizationRuntimePayload,
  type LocalizationRuntimeSettingsSnapshot,
  type LocalizationSelectiveSyncOptions,
} from "@codeai-hub/localization";
import type { SettingsSnapshot } from "./types";

const CORE_ONLY_MATERIALIZATION_ENGINE_IDS = new Set<string>([
  "anthropic-claude-haiku-4-5",
]);

export class LocalizationRuntimeService {
  private readonly localizationFacade: LocalizationFacade;

  constructor(localizationFacade = new LocalizationFacade()) {
    this.localizationFacade = localizationFacade;
  }

  resolveRuntimePayload(
    settings: SettingsSnapshot
  ): Promise<LocalizationRuntimePayload> {
    return this.localizationFacade.resolveRuntimePayload(
      this.createRuntimeSnapshot(settings)
    );
  }

  synchronizeRuntimePayload(
    settings: SettingsSnapshot,
    options?: LocalizationSelectiveSyncOptions
  ): Promise<LocalizationRuntimePayload> {
    const snapshot = this.createRuntimeSnapshot(settings);
    if (CORE_ONLY_MATERIALIZATION_ENGINE_IDS.has(snapshot.engineId)) {
      return this.localizationFacade.resolveRuntimePayload(snapshot);
    }
    return this.localizationFacade.synchronizeRuntimePayload(snapshot, options);
  }

  loadRuntimeBootstrapSnapshot(
    settings: SettingsSnapshot
  ): Promise<LocalizationRuntimeBootstrapSnapshot | null> {
    return this.localizationFacade.loadRuntimeBootstrapSnapshot(
      this.createRuntimeSnapshot(settings)
    );
  }

  private createRuntimeSnapshot(
    settings: SettingsSnapshot
  ): LocalizationRuntimeSettingsSnapshot {
    const { localization } = settings.general;

    return {
      categories: {
        artifacts_for_the_user: localization.categories.artifactsForTheUser,
        interactive_templates: localization.categories.artifactsForTheUser,
        messages_for_the_user: localization.categories.messagesForTheUser,
        system_feedback: localization.categories.messagesForTheUser,
        ui_helper_text: localization.categories.uiHelperText,
        ui_interface: localization.categories.uiLabels,
        ui_labels: localization.categories.uiLabels,
        user_guidance: localization.categories.uiHelperText,
        workflow_terms: localization.categories.uiLabels,
      } as LocalizationRuntimeSettingsSnapshot["categories"],
      defaultLanguage: localization.defaultLanguage,
      engineId: localization.engineId,
      workflowTermsPolicy: localization.workflowTermsPolicy,
    };
  }
}
