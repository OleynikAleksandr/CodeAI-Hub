import type { LocalizationRuntimeSettingsSnapshot } from "@codeai-hub/localization";
import type { SettingsSnapshot } from "./types";

const CANONICAL_SOURCE_LANGUAGE = "en";

const normalizeSelection = (
  value: string | undefined,
  fallback: string
): string => {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) {
    return fallback;
  }
  return trimmed.toLowerCase() === "source"
    ? CANONICAL_SOURCE_LANGUAGE
    : trimmed;
};

const isSameSnapshotCategorySelection = (
  left: string | undefined,
  right: string | undefined
): boolean =>
  normalizeSelection(left, CANONICAL_SOURCE_LANGUAGE) ===
  normalizeSelection(right, CANONICAL_SOURCE_LANGUAGE);

export const createLocalizationRuntimeSettingsSnapshot = (
  settings: SettingsSnapshot
): LocalizationRuntimeSettingsSnapshot => {
  const { localization } = settings.general;

  return {
    categories: {
      interactive_templates: localization.categories.artifactsForTheUser,
      system_feedback: localization.categories.messagesForTheUser,
      ui_interface: localization.categories.uiLabels,
      user_guidance: localization.categories.uiHelperText,
      workflow_terms: localization.categories.uiLabels,
    },
    defaultLanguage: localization.defaultLanguage,
    engineId: localization.engineId,
    workflowTermsPolicy: localization.workflowTermsPolicy,
  };
};

export const matchesLocalizationRuntimeSettingsSnapshot = (
  left: LocalizationRuntimeSettingsSnapshot,
  right: LocalizationRuntimeSettingsSnapshot
): boolean =>
  left.defaultLanguage === right.defaultLanguage &&
  left.engineId === right.engineId &&
  left.workflowTermsPolicy === right.workflowTermsPolicy &&
  isSameSnapshotCategorySelection(
    left.categories.interactive_templates,
    right.categories.interactive_templates
  ) &&
  isSameSnapshotCategorySelection(
    left.categories.system_feedback,
    right.categories.system_feedback
  ) &&
  isSameSnapshotCategorySelection(
    left.categories.ui_interface,
    right.categories.ui_interface
  ) &&
  isSameSnapshotCategorySelection(
    left.categories.user_guidance,
    right.categories.user_guidance
  ) &&
  isSameSnapshotCategorySelection(
    left.categories.workflow_terms,
    right.categories.workflow_terms
  );
