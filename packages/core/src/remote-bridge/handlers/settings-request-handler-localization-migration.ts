const normalizeSettingsString = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;

export interface LocalizationSettingsMigrationInput {
  readonly defaultTranslationEngineId: string;
  readonly mergedLocalization: Record<string, unknown>;
  readonly mergedLocalizationCategories: Record<string, unknown>;
  readonly rawLocalization: Record<string, unknown>;
  readonly rawLocalizationCategories: Record<string, unknown>;
}

export const applyLocalizationSettingsMigration = (
  input: LocalizationSettingsMigrationInput
): boolean => {
  const {
    defaultTranslationEngineId,
    rawLocalization,
    rawLocalizationCategories,
    mergedLocalization,
    mergedLocalizationCategories,
  } = input;

  let changed = false;

  const rawUiEngineId = normalizeSettingsString(rawLocalization.uiEngineId, "");
  const rawLegacyEngineId = normalizeSettingsString(
    rawLocalization.engineId,
    ""
  );
  if (!rawUiEngineId && rawLegacyEngineId) {
    mergedLocalization.uiEngineId = rawLegacyEngineId;
    changed = true;
  }
  if (rawLegacyEngineId) {
    mergedLocalization.engineId = undefined;
    changed = true;
  }
  if (!normalizeSettingsString(mergedLocalization.reasoningEngineId, "")) {
    mergedLocalization.reasoningEngineId = defaultTranslationEngineId;
    changed = true;
  }

  const rawReasoningCategory = normalizeSettingsString(
    rawLocalizationCategories.reasoning,
    ""
  );
  if (!rawReasoningCategory) {
    const migratedFromMessages =
      normalizeSettingsString(
        rawLocalizationCategories.messagesForTheUser,
        ""
      ) ||
      normalizeSettingsString(rawLocalizationCategories.systemFeedback, "");
    if (migratedFromMessages) {
      mergedLocalizationCategories.reasoning = migratedFromMessages;
      changed = true;
    }
  }

  return changed;
};
