import { LOCALIZATION_SOURCE_SELECTION } from "@codeai-hub/localization";
import { resolveGlobalSettingsPath } from "./index";
import { providerSettingsSnapshotCache } from "./json-file-snapshot-cache";

export interface CodexSettingsSnapshot {
  readonly defaultModel?: unknown;
  readonly reasoningByModel?: unknown;
  readonly reasoningSummaryEnabled?: unknown;
  readonly thinkingDisplaySyncEnabled?: unknown;
}

export interface ClaudeProviderSettingsSnapshot {
  readonly defaultModel?: unknown;
  readonly sessionContinuity?: {
    readonly remainingPercentThreshold?: unknown;
  };
  readonly thinking?: unknown;
  readonly thinkingDisplaySyncEnabled?: unknown;
}

export interface ClaudeSettingsSnapshot {
  readonly defaultModel?: unknown;
  readonly providers?: {
    readonly claude?: {
      readonly defaultModel?: unknown;
      readonly sessionContinuity?: {
        readonly remainingPercentThreshold?: unknown;
      };
      readonly thinkingDisplaySyncEnabled?: unknown;
      readonly thinking?: unknown;
    };
  };
  readonly thinking?: unknown;
}

export interface GeminiSettingsSnapshot {
  readonly defaultModel?: unknown;
  readonly thinkingDisplaySyncEnabled?: unknown;
  readonly thinkingLevelByModel?: unknown;
}

export interface KimiSettingsSnapshot {
  readonly defaultModel?: unknown;
  readonly thinkingDisplaySyncEnabled?: unknown;
  readonly thinkingEnabled?: unknown;
}

export interface GlmOpenCodeSettingsSnapshot {
  readonly defaultModel?: unknown;
  readonly thinkingDisplaySyncEnabled?: unknown;
}

export interface GlmNativeSettingsSnapshot {
  readonly defaultModel?: unknown;
  readonly reasoningEffort?: unknown;
  readonly thinkingDisplaySyncEnabled?: unknown;
  readonly thinkingEnabled?: unknown;
}

export interface LocalModelsSettingsSnapshot {
  readonly defaultModel?: unknown;
}

export interface OpenRouterSettingsSnapshot {
  readonly defaultModel?: unknown;
  readonly endpointTag?: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const DEFAULT_LOCALIZATION_LANGUAGE = "en";
const DEFAULT_TRANSLATION_ENGINE_ID = "google-gtx";
const DEFAULT_GLM_OPENCODE_MODEL_ID = "zai-coding-plan/glm-5.2";
const LEGACY_GLM_OPENCODE_MODEL_IDS = new Set([
  "glm-5.1",
  "glm-5-turbo",
  "glm-4.5-air",
  "glm-5.2",
]);

const normalizeOptionalString = (value: unknown): string | undefined =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;

const normalizeGlmOpenCodeModel = (value: unknown): unknown => {
  const modelId = normalizeOptionalString(value);
  return modelId && LEGACY_GLM_OPENCODE_MODEL_IDS.has(modelId)
    ? DEFAULT_GLM_OPENCODE_MODEL_ID
    : value;
};

const normalizeLocalizationLanguage = (
  value: unknown,
  fallback: string
): string => {
  const normalized = normalizeOptionalString(value) ?? fallback;
  return normalized.toLowerCase() === LOCALIZATION_SOURCE_SELECTION
    ? DEFAULT_LOCALIZATION_LANGUAGE
    : normalized;
};

const resolveLocalizationCategory = (
  categories: Record<string, unknown>,
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

const loadJsonSnapshot = (
  settingsPath: string
): Record<string, unknown> | null => {
  return providerSettingsSnapshotCache.readObject(settingsPath);
};

const loadProviderSnapshot = (
  settingsPath: string,
  providerId: string
): Record<string, unknown> | null => {
  const parsed = loadJsonSnapshot(settingsPath);
  if (!parsed) {
    return null;
  }

  const providers = isRecord(parsed.providers) ? parsed.providers : null;
  const provider =
    providers && isRecord(providers[providerId]) ? providers[providerId] : null;
  return provider;
};

const loadLocalizationSettingsSnapshot = (
  settingsPath: string
): Record<string, unknown> | null => {
  const workspace = loadJsonSnapshot(settingsPath);
  const global = loadJsonSnapshot(resolveGlobalSettingsPath());
  if (global && isRecord(global.general)) {
    return {
      ...(workspace ?? {}),
      general: global.general,
    };
  }
  return workspace;
};

export const loadCodexSettingsSnapshot = (
  settingsPath: string
): CodexSettingsSnapshot | null => {
  const codex = loadProviderSnapshot(settingsPath, "codex");
  if (!codex) {
    return null;
  }

  return {
    defaultModel: codex.defaultModel,
    reasoningByModel: codex.reasoningByModel,
    reasoningSummaryEnabled: codex.reasoningSummaryEnabled,
    thinkingDisplaySyncEnabled: codex.thinkingDisplaySyncEnabled,
  };
};

export const loadGeminiSettingsSnapshot = (
  settingsPath: string
): GeminiSettingsSnapshot | null => {
  const gemini = loadProviderSnapshot(settingsPath, "gemini");
  if (!gemini) {
    return null;
  }

  return {
    defaultModel: gemini.defaultModel,
    thinkingLevelByModel: gemini.thinkingLevelByModel,
    thinkingDisplaySyncEnabled: gemini.thinkingDisplaySyncEnabled,
  };
};

export const loadKimiSettingsSnapshot = (
  settingsPath: string
): KimiSettingsSnapshot | null => {
  const kimi = loadProviderSnapshot(settingsPath, "kimi");
  if (!kimi) {
    return null;
  }

  return {
    defaultModel: kimi.defaultModel,
    thinkingDisplaySyncEnabled: kimi.thinkingDisplaySyncEnabled,
    thinkingEnabled: kimi.thinkingEnabled,
  };
};

export const loadGlmOpenCodeSettingsSnapshot = (
  settingsPath: string
): GlmOpenCodeSettingsSnapshot | null => {
  const glmOpenCode = loadProviderSnapshot(settingsPath, "glmOpenCode");
  if (!glmOpenCode) {
    return null;
  }

  return {
    defaultModel: normalizeGlmOpenCodeModel(glmOpenCode.defaultModel),
    thinkingDisplaySyncEnabled: glmOpenCode.thinkingDisplaySyncEnabled,
  };
};

export const loadGlmNativeSettingsSnapshot = (
  settingsPath: string
): GlmNativeSettingsSnapshot | null => {
  const glmNative = loadProviderSnapshot(settingsPath, "glmNative");
  if (!glmNative) {
    return null;
  }

  return {
    defaultModel: glmNative.defaultModel,
    reasoningEffort: glmNative.reasoningEffort,
    thinkingEnabled: glmNative.thinkingEnabled,
    thinkingDisplaySyncEnabled: glmNative.thinkingDisplaySyncEnabled,
  };
};

export const loadLocalModelsSettingsSnapshot = (
  settingsPath: string
): LocalModelsSettingsSnapshot | null => {
  const localModels = loadProviderSnapshot(settingsPath, "localModels");
  if (!localModels) {
    return null;
  }
  return { defaultModel: localModels.defaultModel };
};

export const loadOpenRouterSettingsSnapshot = (
  settingsPath: string
): OpenRouterSettingsSnapshot | null => {
  const openRouter = loadProviderSnapshot(settingsPath, "openRouter");
  if (!openRouter) {
    return null;
  }
  return {
    defaultModel: openRouter.defaultModel,
    endpointTag: openRouter.endpointTag,
  };
};

export const loadClaudeProviderSettingsSnapshot = (
  settingsPath: string
): ClaudeProviderSettingsSnapshot | null => {
  const claude = loadProviderSnapshot(settingsPath, "claude");
  if (!claude) {
    return null;
  }

  return {
    defaultModel: claude.defaultModel,
    thinking: claude.thinking,
    thinkingDisplaySyncEnabled: claude.thinkingDisplaySyncEnabled,
    sessionContinuity: isRecord(claude.sessionContinuity)
      ? {
          remainingPercentThreshold:
            claude.sessionContinuity.remainingPercentThreshold,
        }
      : undefined,
  };
};

export const loadUITranslationEngineId = (settingsPath: string): string => {
  const parsed = loadLocalizationSettingsSnapshot(settingsPath);
  if (!parsed) {
    return DEFAULT_TRANSLATION_ENGINE_ID;
  }

  const general = isRecord(parsed.general) ? parsed.general : {};
  const localization = isRecord(general.localization)
    ? general.localization
    : {};

  return (
    normalizeOptionalString(localization.uiEngineId) ??
    normalizeOptionalString(localization.engineId) ??
    DEFAULT_TRANSLATION_ENGINE_ID
  );
};

export const loadReasoningTranslationEngineId = (
  settingsPath: string
): string => {
  const parsed = loadLocalizationSettingsSnapshot(settingsPath);
  if (!parsed) {
    return DEFAULT_TRANSLATION_ENGINE_ID;
  }

  const general = isRecord(parsed.general) ? parsed.general : {};
  const localization = isRecord(general.localization)
    ? general.localization
    : {};

  return (
    normalizeOptionalString(localization.reasoningEngineId) ??
    DEFAULT_TRANSLATION_ENGINE_ID
  );
};

export const loadReasoningLanguage = (settingsPath: string): string => {
  const parsed = loadLocalizationSettingsSnapshot(settingsPath);
  if (!parsed) {
    return DEFAULT_LOCALIZATION_LANGUAGE;
  }

  const general = isRecord(parsed.general) ? parsed.general : {};
  const localization = isRecord(general.localization)
    ? general.localization
    : {};
  const categories = isRecord(localization.categories)
    ? localization.categories
    : {};
  const defaultLanguage = normalizeLocalizationLanguage(
    localization.defaultLanguage,
    DEFAULT_LOCALIZATION_LANGUAGE
  );
  const fallbackFromMessages = resolveLocalizationCategory(
    categories,
    ["messagesForTheUser", "systemFeedback"],
    defaultLanguage
  );

  return resolveLocalizationCategory(
    categories,
    ["reasoning"],
    fallbackFromMessages
  );
};

export const loadArtifactsForTheUserLanguage = (
  settingsPath: string
): string => {
  const parsed = loadLocalizationSettingsSnapshot(settingsPath);
  if (!parsed) {
    return DEFAULT_LOCALIZATION_LANGUAGE;
  }

  const general = isRecord(parsed.general) ? parsed.general : {};
  const localization = isRecord(general.localization)
    ? general.localization
    : {};
  const categories = isRecord(localization.categories)
    ? localization.categories
    : {};
  const defaultLanguage = normalizeLocalizationLanguage(
    localization.defaultLanguage,
    DEFAULT_LOCALIZATION_LANGUAGE
  );

  return resolveLocalizationCategory(
    categories,
    ["artifactsForTheUser", "artifacts_for_the_user", "interactiveTemplates"],
    defaultLanguage
  );
};
