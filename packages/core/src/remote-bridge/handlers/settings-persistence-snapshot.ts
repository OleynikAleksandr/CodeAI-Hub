import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  LOCALIZATION_SOURCE_SELECTION,
  type LocalizationRuntimeSettingsSnapshot,
} from "@codeai-hub/localization";
import type { CoreConfig } from "../../config";
import { resolveWorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";
import {
  DEFAULT_LOCALIZATION_LANGUAGE,
  DEFAULT_LOCALIZATION_SETTINGS,
  DEFAULT_SETTINGS_SNAPSHOT,
  DEFAULT_TRANSLATION_ENGINE_ID,
} from "./settings-default-snapshot";
import { normalizeClaudeThinkingSettings } from "./settings-request-handler-claude-thinking";
import { applyLocalizationSettingsMigration } from "./settings-request-handler-localization-migration";

const UNSUPPORTED_CODEX_MODEL_ID = "gpt-5.3-codex";

export interface LocalizationComparisonSnapshot {
  readonly artifactsForTheUser: string;
  readonly engineId: string;
  readonly glossaryEnabled: boolean;
  readonly messagesForTheUser: string;
  readonly uiHelperText: string;
  readonly uiLabels: string;
}

export interface SettingsLoadEntry {
  readonly changed: boolean;
  readonly settings: Record<string, unknown>;
}

export interface WorkspaceSettingsScope {
  readonly workspaceRoot: string;
  readonly workspaceSlug: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const normalizeSettingsString = (value: unknown, fallback: string): string =>
  typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : fallback;
const normalizeCodexProviderSettings = (
  rawCodex: Record<string, unknown>,
  defaultCodex: Record<string, unknown>
) => {
  const fallbackModel = defaultCodex.defaultModel as string;
  const rawReasoningByModel = isRecord(rawCodex.reasoningByModel)
    ? rawCodex.reasoningByModel
    : {};
  const reasoningByModel = {
    ...(defaultCodex.reasoningByModel as Record<string, unknown>),
    ...rawReasoningByModel,
  };
  const defaultModel =
    rawCodex.defaultModel === UNSUPPORTED_CODEX_MODEL_ID
      ? fallbackModel
      : normalizeSettingsString(rawCodex.defaultModel, fallbackModel);
  const changed =
    rawCodex.defaultModel === UNSUPPORTED_CODEX_MODEL_ID ||
    UNSUPPORTED_CODEX_MODEL_ID in rawReasoningByModel;
  delete reasoningByModel[UNSUPPORTED_CODEX_MODEL_ID];
  return { changed, defaultModel, reasoningByModel };
};
const mergeDisplaySyncProviderSettings = (
  rawProvider: Record<string, unknown>,
  defaultProvider: Record<string, unknown>
): Record<string, unknown> => ({
  ...defaultProvider,
  ...rawProvider,
  thinkingDisplaySyncEnabled:
    typeof rawProvider.thinkingDisplaySyncEnabled === "boolean"
      ? rawProvider.thinkingDisplaySyncEnabled
      : true,
});
const normalizeLocalizationLanguage = (
  value: unknown,
  fallback: string
): string => {
  const normalized = normalizeSettingsString(value, fallback);
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
    const value = categories[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      continue;
    }
    return normalizeLocalizationLanguage(value, fallback);
  }
  return fallback;
};

export const resolveLocalizationComparisonSnapshot = (
  settings: Record<string, unknown>
): LocalizationComparisonSnapshot => {
  const general = isRecord(settings.general) ? settings.general : {};
  const localization = isRecord(general.localization)
    ? general.localization
    : {};
  const categories = isRecord(localization.categories)
    ? localization.categories
    : {};
  const defaultLanguage = normalizeLocalizationLanguage(
    localization.defaultLanguage,
    DEFAULT_LOCALIZATION_SETTINGS.defaultLanguage
  );

  return {
    artifactsForTheUser: resolveLocalizationCategory(
      categories,
      ["artifactsForTheUser", "interactiveTemplates"],
      defaultLanguage
    ),
    engineId:
      normalizeSettingsString(localization.uiEngineId, "") ||
      normalizeSettingsString(
        localization.engineId,
        DEFAULT_LOCALIZATION_SETTINGS.uiEngineId
      ),
    glossaryEnabled: localization.glossaryEnabled !== false,
    messagesForTheUser: resolveLocalizationCategory(
      categories,
      ["messagesForTheUser", "systemFeedback"],
      defaultLanguage
    ),
    uiHelperText: resolveLocalizationCategory(
      categories,
      ["uiHelperText", "userGuidance"],
      defaultLanguage
    ),
    uiLabels: resolveLocalizationCategory(
      categories,
      ["uiLabels", "uiInterface", "workflowTerms"],
      defaultLanguage
    ),
  };
};

export const resolveLocalizationRuntimeSettings = (
  settings: Record<string, unknown>
): LocalizationRuntimeSettingsSnapshot => {
  const snapshot = resolveLocalizationComparisonSnapshot(settings);
  return {
    categories: {
      artifacts_for_the_user: snapshot.artifactsForTheUser,
      interactive_templates: snapshot.artifactsForTheUser,
      messages_for_the_user: snapshot.messagesForTheUser,
      system_feedback: snapshot.messagesForTheUser,
      ui_helper_text: snapshot.uiHelperText,
      ui_interface: snapshot.uiLabels,
      ui_labels: snapshot.uiLabels,
      user_guidance: snapshot.uiHelperText,
      workflow_terms: snapshot.uiLabels,
    } as LocalizationRuntimeSettingsSnapshot["categories"],
    defaultLanguage: DEFAULT_LOCALIZATION_SETTINGS.defaultLanguage,
    engineId: snapshot.engineId,
    workflowTermsPolicy:
      snapshot.uiLabels.toLowerCase() === DEFAULT_LOCALIZATION_LANGUAGE
        ? "keep_english"
        : "translate",
  };
};

export const buildDefaultSettingsSnapshot = (
  config: CoreConfig
): Record<string, unknown> => {
  const codexDefaultModel =
    config.codexDefaultModel ??
    DEFAULT_SETTINGS_SNAPSHOT.providers.codex.defaultModel;
  const codexDefaultReasoning =
    config.codexDefaultReasoningEffort ??
    (DEFAULT_SETTINGS_SNAPSHOT.providers.codex.reasoningByModel[
      DEFAULT_SETTINGS_SNAPSHOT.providers.codex.defaultModel
    ] as string);
  const remainingPercentThreshold =
    Number.isFinite(config.claudeContinuityRemainingPercentThreshold) &&
    config.claudeContinuityRemainingPercentThreshold > 0
      ? config.claudeContinuityRemainingPercentThreshold
      : DEFAULT_SETTINGS_SNAPSHOT.providers.claude.sessionContinuity
          .remainingPercentThreshold;
  const { gemini: _gemini, ...defaultProviders } =
    DEFAULT_SETTINGS_SNAPSHOT.providers;

  return {
    ...DEFAULT_SETTINGS_SNAPSHOT,
    providers: {
      ...defaultProviders,
      claude: {
        ...DEFAULT_SETTINGS_SNAPSHOT.providers.claude,
        defaultModel: config.claudeDefaultModel,
        sessionContinuity: { remainingPercentThreshold },
      },
      codex: {
        ...DEFAULT_SETTINGS_SNAPSHOT.providers.codex,
        defaultModel: codexDefaultModel,
        reasoningByModel: {
          ...DEFAULT_SETTINGS_SNAPSHOT.providers.codex.reasoningByModel,
          [codexDefaultModel]: codexDefaultReasoning,
        },
        sessionContinuity: { remainingPercentThreshold },
      },
    },
  };
};

export const resolveSettingsSnapshotPath = (params: {
  readonly config: CoreConfig;
  readonly workspace?: WorkspaceSettingsScope;
}): string =>
  params.workspace
    ? resolveWorkspaceRuntimeCapsule({
        workspaceRoot: params.workspace.workspaceRoot,
        workspaceSlug: params.workspace.workspaceSlug,
      }).settingsFile.absolutePath
    : params.config.claudeSettingsPath;

export const normalizeLoadedSettingsSnapshotWithDefaults = (
  settings: Record<string, unknown>,
  config: CoreConfig
): SettingsLoadEntry => {
  const defaults = buildDefaultSettingsSnapshot(config) as {
    readonly general: Record<string, unknown>;
    readonly providers: {
      readonly claude: Record<string, unknown>;
      readonly codex: Record<string, unknown>;
      readonly glmNative: Record<string, unknown>;
      readonly kimi: Record<string, unknown>;
      readonly glmOpenCode: Record<string, unknown>;
      readonly openRouter: Record<string, unknown>;
    };
  };
  const rawGeneral = isRecord(settings.general) ? settings.general : {};
  const rawLocalization = isRecord(rawGeneral.localization)
    ? rawGeneral.localization
    : {};
  const rawLocalizationCategories = isRecord(rawLocalization.categories)
    ? rawLocalization.categories
    : {};
  const rawProviders = isRecord(settings.providers) ? settings.providers : {};
  const rawClaude = isRecord(rawProviders.claude) ? rawProviders.claude : {};
  const rawCodex = isRecord(rawProviders.codex) ? rawProviders.codex : {};
  const rawKimi = isRecord(rawProviders.kimi) ? rawProviders.kimi : {};
  const rawGlmOpenCode = isRecord(rawProviders.glmOpenCode)
    ? rawProviders.glmOpenCode
    : {};
  const rawGlmNative = isRecord(rawProviders.glmNative)
    ? rawProviders.glmNative
    : {};
  const rawOpenRouter = isRecord(rawProviders.openRouter)
    ? rawProviders.openRouter
    : {};
  const normalizedClaudeThinking = normalizeClaudeThinkingSettings({
    defaultThinkingSettings: defaults.providers.claude.thinking as {
      readonly enabled: boolean;
      readonly effort: string;
    },
    value: rawClaude.thinking,
  });
  const claude: Record<string, unknown> & {
    defaultModel?: unknown;
    thinking: { readonly enabled: boolean; readonly effort: string };
    thinkingDisplaySyncEnabled?: unknown;
  } = {
    ...defaults.providers.claude,
    ...rawClaude,
    thinking: normalizedClaudeThinking,
  };
  const codexSettings = normalizeCodexProviderSettings(
    rawCodex,
    defaults.providers.codex
  );
  const general = {
    ...defaults.general,
    ...rawGeneral,
    localization: {
      ...(defaults.general.localization as Record<string, unknown>),
      ...rawLocalization,
      categories: {
        ...(
          defaults.general.localization as {
            readonly categories: Record<string, unknown>;
          }
        ).categories,
        ...rawLocalizationCategories,
      },
    } as Record<string, unknown>,
  };

  let changed = applyLocalizationSettingsMigration({
    defaultTranslationEngineId: DEFAULT_TRANSLATION_ENGINE_ID,
    mergedLocalization: general.localization,
    mergedLocalizationCategories: general.localization.categories as Record<
      string,
      unknown
    >,
    rawLocalization,
    rawLocalizationCategories,
  });

  if (
    !(
      isRecord(settings.general) &&
      isRecord(rawGeneral.localization) &&
      isRecord(rawLocalization.categories) &&
      isRecord(settings.providers) &&
      isRecord(rawProviders.claude) &&
      isRecord(rawProviders.codex) &&
      isRecord(rawProviders.kimi) &&
      isRecord(rawProviders.glmOpenCode) &&
      isRecord(rawProviders.glmNative) &&
      isRecord(rawProviders.openRouter)
    )
  ) {
    changed = true;
  }
  if (claude.defaultModel === "default") {
    claude.defaultModel = "sonnet";
    changed = true;
  }
  if (typeof claude.thinkingDisplaySyncEnabled !== "boolean") {
    claude.thinkingDisplaySyncEnabled = true;
    changed = true;
  }
  if (
    [rawKimi, rawGlmOpenCode, rawGlmNative].some(
      (provider) => typeof provider.thinkingDisplaySyncEnabled !== "boolean"
    )
  ) {
    changed = true;
  }
  if (
    JSON.stringify(rawClaude.thinking) !==
    JSON.stringify(normalizedClaudeThinking)
  ) {
    changed = true;
  }
  if (codexSettings.changed) {
    changed = true;
  }

  return {
    changed,
    settings: {
      ...settings,
      general,
      providers: {
        ...rawProviders,
        claude,
        codex: {
          ...defaults.providers.codex,
          ...rawCodex,
          defaultModel: codexSettings.defaultModel,
          reasoningByModel: codexSettings.reasoningByModel,
        },
        kimi: mergeDisplaySyncProviderSettings(
          rawKimi,
          defaults.providers.kimi
        ),
        glmOpenCode: mergeDisplaySyncProviderSettings(
          rawGlmOpenCode,
          defaults.providers.glmOpenCode
        ),
        glmNative: mergeDisplaySyncProviderSettings(
          rawGlmNative,
          defaults.providers.glmNative
        ),
        openRouter: {
          ...defaults.providers.openRouter,
          ...rawOpenRouter,
        },
      },
    },
  };
};

export const persistSettingsSnapshot = async (
  settingsPath: string,
  snapshot: Record<string, unknown>
): Promise<void> => {
  await mkdir(path.dirname(settingsPath), { recursive: true });
  await writeFile(
    settingsPath,
    `${JSON.stringify(snapshot, null, 2)}\n`,
    "utf8"
  );
};
