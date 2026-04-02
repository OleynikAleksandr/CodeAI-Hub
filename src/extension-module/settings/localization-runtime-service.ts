import {
  type LocalizationCategoryId,
  LocalizationFacade,
  type LocalizationRuntimePayload,
  type LocalizationRuntimeSettingsSnapshot,
} from "@codeai-hub/localization";
import type { SettingsSnapshot } from "./types";

type SettingsLocalizationCategoryKey =
  keyof SettingsSnapshot["general"]["localization"]["categories"];

const LOCALIZATION_CATEGORY_BINDINGS = [
  {
    categoryId: "interactive_templates",
    settingsKey: "interactiveTemplates",
  },
  {
    categoryId: "system_feedback",
    settingsKey: "systemFeedback",
  },
  {
    categoryId: "ui_interface",
    settingsKey: "uiInterface",
  },
  {
    categoryId: "user_guidance",
    settingsKey: "userGuidance",
  },
  {
    categoryId: "workflow_terms",
    settingsKey: "workflowTerms",
  },
] as const satisfies readonly {
  readonly categoryId: LocalizationCategoryId;
  readonly settingsKey: SettingsLocalizationCategoryKey;
}[];

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

  private createRuntimeSnapshot(
    settings: SettingsSnapshot
  ): LocalizationRuntimeSettingsSnapshot {
    const { localization } = settings.general;

    return {
      categories: Object.fromEntries(
        LOCALIZATION_CATEGORY_BINDINGS.map((binding) => [
          binding.categoryId,
          localization.categories[binding.settingsKey],
        ])
      ) as LocalizationRuntimeSettingsSnapshot["categories"],
      defaultLanguage: localization.defaultLanguage,
      engineId: localization.engineId,
      workflowTermsPolicy: localization.workflowTermsPolicy,
    };
  }
}
