import type { BrowserLocalizationBootstrapSnapshot } from "../app-host/localization-runtime-contract";
import {
  createDefaultSettings,
  type Settings,
} from "../components/settings/settings-state-model";
import { normalizeLoadedLocalizationSettings } from "../components/settings/use-settings-state-support";

export const createBootstrapSettings = (
  snapshot: BrowserLocalizationBootstrapSnapshot
): Settings => {
  const defaultSettings = createDefaultSettings();
  if (!snapshot) {
    return defaultSettings;
  }

  return normalizeLoadedLocalizationSettings({
    ...defaultSettings,
    general: {
      ...defaultSettings.general,
      localization: {
        ...defaultSettings.general.localization,
        categories: {
          ...defaultSettings.general.localization.categories,
          artifactsForTheUser:
            snapshot.settings.categories.interactive_templates,
          interactiveTemplates:
            snapshot.settings.categories.interactive_templates,
          messagesForTheUser: snapshot.settings.categories.system_feedback,
          systemFeedback: snapshot.settings.categories.system_feedback,
          uiHelperText: snapshot.settings.categories.user_guidance,
          uiInterface: snapshot.settings.categories.ui_interface,
          uiLabels: snapshot.settings.categories.ui_interface,
          userGuidance: snapshot.settings.categories.user_guidance,
          workflowTerms: snapshot.settings.categories.workflow_terms,
        },
        defaultLanguage: snapshot.settings.defaultLanguage,
        engineId: snapshot.settings.engineId,
        workflowTermsPolicy: snapshot.settings.workflowTermsPolicy,
      },
    },
  });
};
