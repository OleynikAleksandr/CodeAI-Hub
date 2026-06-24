import {
  DEFAULT_LOCALIZATION_ENGINE_ID,
  DEFAULT_LOCALIZATION_SOURCE_LANGUAGE,
  LOCALIZATION_CATEGORY_IDS,
  LOCALIZATION_SOURCE_SELECTION,
  type LocalizationRuntimeSettingsSnapshot,
  type LocalizationWorkflowTermsPolicy,
  resolveLocalizationPaths,
} from "@codeai-hub/localization";
import {
  resolveGlobalLocalizationRootPath,
  resolveGlobalSettingsPath,
} from "../config";
import { providerSettingsSnapshotCache } from "../config/json-file-snapshot-cache";
import {
  loadClaudeProviderSettingsSnapshot,
  loadCodexSettingsSnapshot,
  loadGlmOpenCodeSettingsSnapshot,
  loadKimiSettingsSnapshot,
  loadReasoningLanguage,
  loadReasoningTranslationEngineId,
  loadUITranslationEngineId,
} from "../config/provider-settings-snapshot";

export type SessionThinkingVisibilityProviderId =
  | "claude"
  | "codex"
  | "kimi"
  | "glmOpenCode";
export type SessionTranslationPolicyCategory =
  | "messages_for_the_user"
  | "reasoning";

const resolveThinkingVisibilityEnabled = (value: unknown): boolean =>
  value !== false;

const SOURCE_LANGUAGE = DEFAULT_LOCALIZATION_SOURCE_LANGUAGE;
const DEFAULT_WORKFLOW_TERMS_POLICY: LocalizationWorkflowTermsPolicy =
  "keep_english";

type JsonRecord = Record<string, unknown>;

type SessionTranslationPolicySkipReason =
  | "localization_sync_pending"
  | "missing_target_language"
  | null;

export interface SessionTranslationPolicy {
  readonly category: SessionTranslationPolicyCategory;
  readonly enabled: boolean;
  readonly engineId: string;
  readonly skipReason: SessionTranslationPolicySkipReason;
  readonly sourceLanguage: "en";
  readonly targetLanguage: string | null;
}

const isRecord = (value: unknown): value is JsonRecord =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const normalizeOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

const normalizeLocalizationLanguage = (
  value: unknown,
  fallback: string
): string => {
  const normalized = normalizeOptionalString(value) ?? fallback;
  return normalized.toLowerCase() === LOCALIZATION_SOURCE_SELECTION
    ? SOURCE_LANGUAGE
    : normalized;
};

const resolveLocalizationCategory = (
  categories: JsonRecord,
  candidateKeys: readonly string[],
  fallback: string
): string => {
  for (const key of candidateKeys) {
    const resolved = normalizeOptionalString(categories[key]);
    if (resolved) {
      return normalizeLocalizationLanguage(resolved, fallback);
    }
  }

  return fallback;
};

const resolveBrowserRuntimeBootstrapPath = (): string =>
  resolveLocalizationPaths({
    rootDirectory: resolveGlobalLocalizationRootPath(),
  }).browserRuntimeBootstrapFilePath;

const parseSettingsSnapshot = (
  value: unknown
): LocalizationRuntimeSettingsSnapshot | null => {
  if (
    !(
      isRecord(value) &&
      typeof value.defaultLanguage === "string" &&
      typeof value.engineId === "string" &&
      (value.workflowTermsPolicy === "keep_english" ||
        value.workflowTermsPolicy === "translate") &&
      isRecord(value.categories)
    )
  ) {
    return null;
  }

  const categoriesValue = value.categories;
  const categories = Object.fromEntries(
    LOCALIZATION_CATEGORY_IDS.map((category) => {
      const categoryValue = categoriesValue[category];
      return [
        category,
        typeof categoryValue === "string" ? categoryValue : null,
      ];
    })
  );
  if (
    Object.values(categories).some((categoryValue) => categoryValue === null)
  ) {
    return null;
  }

  return {
    categories: categories as LocalizationRuntimeSettingsSnapshot["categories"],
    defaultLanguage: value.defaultLanguage,
    engineId: value.engineId,
    workflowTermsPolicy: value.workflowTermsPolicy,
  };
};

const settingsMatch = (
  left: LocalizationRuntimeSettingsSnapshot,
  right: LocalizationRuntimeSettingsSnapshot
): boolean =>
  left.defaultLanguage === right.defaultLanguage &&
  left.engineId === right.engineId &&
  left.workflowTermsPolicy === right.workflowTermsPolicy &&
  LOCALIZATION_CATEGORY_IDS.every(
    (category) => left.categories[category] === right.categories[category]
  );

export class SessionTranslationPolicyResolver {
  resolveThinkingVisibility(
    settingsPath: string,
    providerId: SessionThinkingVisibilityProviderId
  ): boolean {
    if (providerId === "claude") {
      const claude = loadClaudeProviderSettingsSnapshot(settingsPath);
      return resolveThinkingVisibilityEnabled(
        claude?.thinkingDisplaySyncEnabled
      );
    }
    if (providerId === "kimi") {
      const kimi = loadKimiSettingsSnapshot(settingsPath);
      return resolveThinkingVisibilityEnabled(kimi?.thinkingDisplaySyncEnabled);
    }
    if (providerId === "glmOpenCode") {
      const openCode = loadGlmOpenCodeSettingsSnapshot(settingsPath);
      return resolveThinkingVisibilityEnabled(
        openCode?.thinkingDisplaySyncEnabled
      );
    }
    const codex = loadCodexSettingsSnapshot(settingsPath);
    return (
      codex?.reasoningSummaryEnabled !== false &&
      resolveThinkingVisibilityEnabled(codex?.thinkingDisplaySyncEnabled)
    );
  }

  resolve(
    settingsPath: string,
    category: SessionTranslationPolicyCategory = "reasoning"
  ): SessionTranslationPolicy {
    const runtimeSettings = this.createRuntimeSettingsSnapshot(settingsPath);
    const engineId = this.resolveTranslationEngineId(settingsPath, category);
    const resolvedTargetLanguage = this.resolveTargetLanguage(
      settingsPath,
      runtimeSettings,
      category
    );
    const targetLanguage =
      resolvedTargetLanguage === SOURCE_LANGUAGE
        ? null
        : resolvedTargetLanguage;
    if (!targetLanguage) {
      return {
        category,
        enabled: false,
        engineId,
        skipReason: "missing_target_language",
        sourceLanguage: SOURCE_LANGUAGE,
        targetLanguage: null,
      };
    }

    const persistedSnapshot = this.loadPersistedBootstrapSnapshot();
    const matchingBootstrap =
      persistedSnapshot &&
      settingsMatch(persistedSnapshot.settings, runtimeSettings) &&
      persistedSnapshot.activeEngineId === runtimeSettings.engineId &&
      persistedSnapshot.systemFeedbackSource === "materialized";
    if (!matchingBootstrap) {
      return {
        category,
        enabled: false,
        engineId,
        skipReason: "localization_sync_pending",
        sourceLanguage: SOURCE_LANGUAGE,
        targetLanguage,
      };
    }

    return {
      category,
      enabled: true,
      engineId,
      skipReason: null,
      sourceLanguage: SOURCE_LANGUAGE,
      targetLanguage,
    };
  }

  private resolveTargetLanguage(
    settingsPath: string,
    runtimeSettings: LocalizationRuntimeSettingsSnapshot,
    category: SessionTranslationPolicyCategory
  ): string {
    if (category === "messages_for_the_user") {
      return runtimeSettings.categories.system_feedback.trim().toLowerCase();
    }
    return loadReasoningLanguage(settingsPath).trim().toLowerCase();
  }

  private resolveTranslationEngineId(
    settingsPath: string,
    category: SessionTranslationPolicyCategory
  ): string {
    if (category === "messages_for_the_user") {
      return loadUITranslationEngineId(settingsPath);
    }
    return loadReasoningTranslationEngineId(settingsPath);
  }

  private createRuntimeSettingsSnapshot(
    settingsPath: string
  ): LocalizationRuntimeSettingsSnapshot {
    const parsed = this.loadJsonSnapshot(settingsPath);
    const general = parsed && isRecord(parsed.general) ? parsed.general : {};
    const localization = isRecord(general.localization)
      ? general.localization
      : {};
    const defaultLanguage = normalizeLocalizationLanguage(
      localization.defaultLanguage,
      SOURCE_LANGUAGE
    );
    const categories = isRecord(localization.categories)
      ? localization.categories
      : {};
    const uiLabels = resolveLocalizationCategory(
      categories,
      ["uiLabels", "uiInterface", "workflowTerms"],
      defaultLanguage
    );
    const uiHelperText = resolveLocalizationCategory(
      categories,
      ["uiHelperText", "userGuidance"],
      defaultLanguage
    );
    const messagesForTheUser = resolveLocalizationCategory(
      categories,
      ["messagesForTheUser", "systemFeedback"],
      defaultLanguage
    );
    const artifactsForTheUser = resolveLocalizationCategory(
      categories,
      ["artifactsForTheUser", "interactiveTemplates"],
      defaultLanguage
    );
    const workflowTermsPolicy: LocalizationWorkflowTermsPolicy =
      uiLabels.toLowerCase() === SOURCE_LANGUAGE
        ? DEFAULT_WORKFLOW_TERMS_POLICY
        : "translate";

    return {
      categories: {
        interactive_templates: artifactsForTheUser,
        system_feedback: messagesForTheUser,
        ui_interface: uiLabels,
        user_guidance: uiHelperText,
        workflow_terms: uiLabels,
      },
      defaultLanguage,
      engineId:
        loadUITranslationEngineId(settingsPath) ??
        DEFAULT_LOCALIZATION_ENGINE_ID,
      workflowTermsPolicy:
        localization.workflowTermsPolicy === "translate"
          ? "translate"
          : workflowTermsPolicy,
    };
  }

  private loadJsonSnapshot(settingsPath: string): JsonRecord | null {
    const workspace = providerSettingsSnapshotCache.readObject(settingsPath);
    const global = providerSettingsSnapshotCache.readObject(
      resolveGlobalSettingsPath()
    );
    if (global && isRecord(global.general)) {
      return {
        ...(workspace ?? {}),
        general: global.general,
      };
    }
    return workspace;
  }

  private loadPersistedBootstrapSnapshot(): {
    readonly activeEngineId: string;
    readonly settings: LocalizationRuntimeSettingsSnapshot;
    readonly systemFeedbackSource: "materialized" | "source_fallback";
  } | null {
    const parsed = providerSettingsSnapshotCache.readObject(
      resolveBrowserRuntimeBootstrapPath()
    );
    if (!(parsed && isRecord(parsed.runtimePayload))) {
      return null;
    }

    const settings = parseSettingsSnapshot(parsed.settings);
    const runtimePayload = parsed.runtimePayload;
    const resolvedBundles = isRecord(runtimePayload.resolvedBundlesByCategory)
      ? runtimePayload.resolvedBundlesByCategory
      : null;
    const systemFeedbackBundle =
      resolvedBundles && isRecord(resolvedBundles.system_feedback)
        ? resolvedBundles.system_feedback
        : null;
    const systemFeedbackSource =
      systemFeedbackBundle?.source === "materialized" ||
      systemFeedbackBundle?.source === "source_fallback"
        ? systemFeedbackBundle.source
        : null;
    if (
      !(
        settings &&
        typeof runtimePayload.activeEngineId === "string" &&
        systemFeedbackSource
      )
    ) {
      return null;
    }

    return {
      activeEngineId: runtimePayload.activeEngineId,
      settings,
      systemFeedbackSource,
    };
  }
}
