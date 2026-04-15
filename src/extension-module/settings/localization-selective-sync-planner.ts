import type {
  ApprovedLocalizationGroupId,
  LocalizationSaveImpact,
} from "./localization-settings-impact-classifier";
import type { SettingsSnapshot } from "./types";

const SOURCE_LANGUAGE = "en";

export type LocalizationRuntimeBundleId =
  | "ui_interface"
  | "workflow_terms"
  | "user_guidance"
  | "system_feedback"
  | "interactive_templates";

export type LocalizationSelectiveSyncScope =
  | "none"
  | "all_non_english"
  | "affected_only";

export interface LocalizationSelectiveSyncPlan {
  readonly affectedApprovedGroups: readonly ApprovedLocalizationGroupId[];
  readonly affectedRuntimeBundleIds: readonly LocalizationRuntimeBundleId[];
  readonly rebuildScope: LocalizationSelectiveSyncScope;
}

const APPROVED_GROUP_TO_RUNTIME_BUNDLES: Readonly<
  Record<ApprovedLocalizationGroupId, readonly LocalizationRuntimeBundleId[]>
> = {
  ui_labels: ["ui_interface", "workflow_terms"],
  ui_helper_text: ["user_guidance"],
  messages_for_the_user: ["system_feedback"],
  artifacts_for_the_user: ["interactive_templates"],
};

const APPROVED_GROUP_TO_SETTINGS_LANGUAGE: Readonly<
  Record<ApprovedLocalizationGroupId, keyof SettingsLocalizationCategoryView>
> = {
  ui_labels: "uiLabels",
  ui_helper_text: "uiHelperText",
  messages_for_the_user: "messagesForTheUser",
  artifacts_for_the_user: "artifactsForTheUser",
};

interface SettingsLocalizationCategoryView {
  readonly artifactsForTheUser: string;
  readonly messagesForTheUser: string;
  readonly uiHelperText: string;
  readonly uiLabels: string;
}

const EMPTY_PLAN: LocalizationSelectiveSyncPlan = {
  affectedApprovedGroups: [],
  affectedRuntimeBundleIds: [],
  rebuildScope: "none",
};

export class LocalizationSelectiveSyncPlanner {
  plan(
    impact: LocalizationSaveImpact,
    nextSettings: SettingsSnapshot
  ): LocalizationSelectiveSyncPlan {
    if (impact.kind === "none") {
      return EMPTY_PLAN;
    }

    const categories = nextSettings.general.localization.categories;

    if (impact.kind === "engine") {
      return this.planEngineRebuild(categories);
    }

    return this.planCategoryRebuild(impact.changedGroups);
  }

  private planEngineRebuild(
    categories: SettingsLocalizationCategoryView
  ): LocalizationSelectiveSyncPlan {
    const affectedGroups: ApprovedLocalizationGroupId[] = [];
    const affectedBundles: LocalizationRuntimeBundleId[] = [];

    for (const group of Object.keys(
      APPROVED_GROUP_TO_SETTINGS_LANGUAGE
    ) as ApprovedLocalizationGroupId[]) {
      const settingsKey = APPROVED_GROUP_TO_SETTINGS_LANGUAGE[group];
      const language = categories[settingsKey];
      if (!this.isNonEnglish(language)) {
        continue;
      }
      affectedGroups.push(group);
      for (const bundle of APPROVED_GROUP_TO_RUNTIME_BUNDLES[group]) {
        affectedBundles.push(bundle);
      }
    }

    return {
      affectedApprovedGroups: affectedGroups,
      affectedRuntimeBundleIds: affectedBundles,
      rebuildScope: "all_non_english",
    };
  }

  private planCategoryRebuild(
    changedGroups: readonly ApprovedLocalizationGroupId[]
  ): LocalizationSelectiveSyncPlan {
    const affectedBundles: LocalizationRuntimeBundleId[] = [];

    for (const group of changedGroups) {
      for (const bundle of APPROVED_GROUP_TO_RUNTIME_BUNDLES[group]) {
        affectedBundles.push(bundle);
      }
    }

    return {
      affectedApprovedGroups: changedGroups,
      affectedRuntimeBundleIds: affectedBundles,
      rebuildScope: "affected_only",
    };
  }

  private isNonEnglish(language: string): boolean {
    const normalized = language.trim().toLowerCase();
    return normalized.length > 0 && normalized !== SOURCE_LANGUAGE;
  }
}
