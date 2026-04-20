import type { GeneralLocalizationSettings } from "./general-settings";
import type { SettingsSnapshot } from "./types";

export type ApprovedLocalizationGroupId =
  | "ui_labels"
  | "ui_helper_text"
  | "messages_for_the_user"
  | "artifacts_for_the_user";

export type LocalizationSaveImpactKind = "none" | "engine" | "categories";

export interface LocalizationSaveImpact {
  readonly changedGroups: readonly ApprovedLocalizationGroupId[];
  readonly kind: LocalizationSaveImpactKind;
}

const NO_IMPACT: LocalizationSaveImpact = {
  kind: "none",
  changedGroups: [],
};

export class LocalizationSettingsImpactClassifier {
  classify(
    previous: SettingsSnapshot,
    next: SettingsSnapshot
  ): LocalizationSaveImpact {
    const previousLocalization = previous.general.localization;
    const nextLocalization = next.general.localization;

    // Strict localization impact is driven exclusively by UI-owned fields:
    // the UI translation engine id, the glossary-enabled flag, and the four
    // UI-owned category languages. The reasoning translation engine id and
    // the reasoning category language are runtime-only: changing them does
    // not rematerialize bundles, block Settings save, or gate PM sends, and
    // is therefore intentionally NOT inspected here.
    if (previousLocalization.engineId !== nextLocalization.engineId) {
      return { kind: "engine", changedGroups: [] };
    }

    if (
      previousLocalization.glossaryEnabled !== nextLocalization.glossaryEnabled
    ) {
      return { kind: "engine", changedGroups: [] };
    }

    const changedGroups = this.resolveChangedGroups(
      previousLocalization,
      nextLocalization
    );
    if (changedGroups.length > 0) {
      return { kind: "categories", changedGroups };
    }

    return NO_IMPACT;
  }

  private resolveChangedGroups(
    previous: GeneralLocalizationSettings,
    next: GeneralLocalizationSettings
  ): readonly ApprovedLocalizationGroupId[] {
    const changed: ApprovedLocalizationGroupId[] = [];

    if (previous.categories.uiLabels !== next.categories.uiLabels) {
      changed.push("ui_labels");
    }
    if (previous.categories.uiHelperText !== next.categories.uiHelperText) {
      changed.push("ui_helper_text");
    }
    if (
      previous.categories.messagesForTheUser !==
      next.categories.messagesForTheUser
    ) {
      changed.push("messages_for_the_user");
    }
    if (
      previous.categories.artifactsForTheUser !==
      next.categories.artifactsForTheUser
    ) {
      changed.push("artifacts_for_the_user");
    }

    return changed;
  }
}
