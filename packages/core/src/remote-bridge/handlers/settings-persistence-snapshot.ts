import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  LOCALIZATION_SOURCE_SELECTION,
  type LocalizationRuntimeSettingsSnapshot,
} from "@codeai-hub/localization";
import type { CoreConfig } from "../../config";
import { resolveWorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";
import { normalizeClaudeThinkingSettings } from "./settings-request-handler-claude-thinking";
import { applyLocalizationSettingsMigration } from "./settings-request-handler-localization-migration";

const DEFAULT_LOCALIZATION_LANGUAGE = "en";
const DEFAULT_TRANSLATION_ENGINE_ID = "google-gtx";
const UNSUPPORTED_CODEX_MODEL_ID = "gpt-5.3-codex";

const DEFAULT_LOCALIZATION_SETTINGS = {
  defaultLanguage: DEFAULT_LOCALIZATION_LANGUAGE,
  categories: {
    artifactsForTheUser: DEFAULT_LOCALIZATION_LANGUAGE,
    interactiveTemplates: DEFAULT_LOCALIZATION_LANGUAGE,
    messagesForTheUser: DEFAULT_LOCALIZATION_LANGUAGE,
    reasoning: DEFAULT_LOCALIZATION_LANGUAGE,
    systemFeedback: DEFAULT_LOCALIZATION_LANGUAGE,
    uiHelperText: DEFAULT_LOCALIZATION_LANGUAGE,
    uiInterface: DEFAULT_LOCALIZATION_LANGUAGE,
    uiLabels: DEFAULT_LOCALIZATION_LANGUAGE,
    userGuidance: DEFAULT_LOCALIZATION_LANGUAGE,
    workflowTerms: DEFAULT_LOCALIZATION_LANGUAGE,
  },
  workflowTermsPolicy: "keep_english",
  uiEngineId: DEFAULT_TRANSLATION_ENGINE_ID,
  reasoningEngineId: DEFAULT_TRANSLATION_ENGINE_ID,
  glossaryEnabled: true,
} as const;

const DEFAULT_SETTINGS_SNAPSHOT = {
  general: {
    coreControls: {
      allowRestart: true,
    },
    localization: DEFAULT_LOCALIZATION_SETTINGS,
    responsePolicy: {
      mode: "hybrid",
      strictOutput: {
        schemaText: `${JSON.stringify(
          {
            type: "object",
            additionalProperties: false,
            properties: {
              answer: {
                type: "string",
                description: "Final answer for the user. Markdown allowed.",
              },
            },
            required: ["answer"],
          },
          null,
          2
        )}\n`,
        instructionText: [
          "You must respond with a JSON object that matches the provided schema.",
          "Populate the field:",
          "- answer: the user-facing answer.",
          "Return only JSON, no extra text.",
          "",
          "User request:",
        ].join("\n"),
      },
    },
    textToSpeech: {
      rate: 1,
    },
  },
  providers: {
    claude: {
      thinking: {
        enabled: true,
        effort: "medium",
      },
      thinkingDisplaySyncEnabled: true,
      autoUpdate: { enabled: false },
      defaultModel: "sonnet",
      sessionContinuity: { remainingPercentThreshold: 30 },
    },
    codex: {
      autoUpdate: { enabled: false },
      defaultModel: "gpt-5.4-mini",
      reasoningByModel: {
        "gpt-5.2": "medium",
        "gpt-5.3-codex-spark": "medium",
        "gpt-5.4-mini": "medium",
        "gpt-5.4": "medium",
        "gpt-5.5": "medium",
      },
      sessionContinuity: { remainingPercentThreshold: 30 },
    },
    gemini: {
      autoUpdate: { enabled: false },
      defaultModel: "gemini-3-pro-preview",
      thinkingDisplaySyncEnabled: true,
      thinkingLevelByModel: {},
      sessionContinuity: {
        remainingPercentThreshold: 30,
        contextWindowTokenLimit: 300_000,
      },
    },
    kimi: {
      autoUpdate: { enabled: false },
      defaultModel: "kimi-k2.7-code",
      thinkingDisplaySyncEnabled: true,
    },
    glmClaudeCode: {
      apiKey: "",
      baseUrl: "https://api.z.ai/api/anthropic",
      configPath: "~/.codeai-hub/providers/glm-claude-code/config.json",
      defaultModel: "glm-5.2",
      haikuModel: "glm-5.2",
      opusModel: "glm-5.2",
      sonnetModel: "glm-5.2",
      thinkingDisplaySyncEnabled: true,
    },
  },
} as const;

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
  const geminiDefaultModel =
    config.geminiDefaultModel ??
    DEFAULT_SETTINGS_SNAPSHOT.providers.gemini.defaultModel;

  return {
    ...DEFAULT_SETTINGS_SNAPSHOT,
    providers: {
      ...DEFAULT_SETTINGS_SNAPSHOT.providers,
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
      gemini: {
        ...DEFAULT_SETTINGS_SNAPSHOT.providers.gemini,
        defaultModel: geminiDefaultModel,
        sessionContinuity: {
          ...DEFAULT_SETTINGS_SNAPSHOT.providers.gemini.sessionContinuity,
          remainingPercentThreshold,
        },
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
      readonly gemini: Record<string, unknown>;
      readonly kimi: Record<string, unknown>;
      readonly glmClaudeCode: Record<string, unknown>;
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
  const rawGemini = isRecord(rawProviders.gemini) ? rawProviders.gemini : {};
  const rawKimi = isRecord(rawProviders.kimi) ? rawProviders.kimi : {};
  const rawGlmClaudeCode = isRecord(rawProviders.glmClaudeCode)
    ? rawProviders.glmClaudeCode
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
      isRecord(rawProviders.gemini) &&
      isRecord(rawProviders.kimi) &&
      isRecord(rawProviders.glmClaudeCode)
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
    typeof rawGemini.thinkingDisplaySyncEnabled !== "boolean" ||
    typeof rawKimi.thinkingDisplaySyncEnabled !== "boolean" ||
    typeof rawGlmClaudeCode.thinkingDisplaySyncEnabled !== "boolean"
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
        gemini: {
          ...defaults.providers.gemini,
          ...rawGemini,
          thinkingDisplaySyncEnabled:
            typeof rawGemini.thinkingDisplaySyncEnabled === "boolean"
              ? rawGemini.thinkingDisplaySyncEnabled
              : true,
        },
        kimi: {
          ...defaults.providers.kimi,
          ...rawKimi,
          thinkingDisplaySyncEnabled:
            typeof rawKimi.thinkingDisplaySyncEnabled === "boolean"
              ? rawKimi.thinkingDisplaySyncEnabled
              : true,
        },
        glmClaudeCode: {
          ...defaults.providers.glmClaudeCode,
          ...rawGlmClaudeCode,
          thinkingDisplaySyncEnabled:
            typeof rawGlmClaudeCode.thinkingDisplaySyncEnabled === "boolean"
              ? rawGlmClaudeCode.thinkingDisplaySyncEnabled
              : true,
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
