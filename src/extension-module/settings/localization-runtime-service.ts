import {
  LocalizationFacade,
  type LocalizationRuntimeBootstrapSnapshot,
  type LocalizationRuntimePayload,
  type LocalizationRuntimeSettingsSnapshot,
} from "@codeai-hub/localization";
import type { SettingsSnapshot } from "./types";

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
