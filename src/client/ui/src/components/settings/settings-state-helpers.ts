import type {
  ClaudeModelAliasId,
  ClaudeThinkingEffort,
} from "../../../../../types/claude-model-registry";
import type {
  CodexModelId,
  CodexReasoningLevel,
} from "../../../../../types/codex-model-registry";
import type {
  GeminiModelId,
  GeminiThinkingLevel,
} from "../../../../../types/gemini-model-registry";
import {
  DEFAULT_KIMI_MODEL_ID,
  type KimiModelId,
} from "../../../../../types/kimi-model-registry";
import type { GeneralResponseMode } from "./general-response-mode/response-mode-state";
import type {
  ProviderId,
  RawSettingsSnapshot,
  Settings,
} from "./settings-state-model";

export const serializeSettingsForPersistence = (
  settings: Settings
): RawSettingsSnapshot => {
  const { engineId, ...localization } = settings.general.localization;
  return {
    ...settings,
    general: {
      ...settings.general,
      localization: {
        ...localization,
        uiEngineId: engineId,
      },
    },
  };
};

export const updateThinkingSettings = (
  settings: Settings,
  enabled: boolean,
  effort: ClaudeThinkingEffort
): Settings => ({
  ...settings,
  providers: {
    ...settings.providers,
    claude: {
      ...settings.providers.claude,
      thinking: {
        enabled,
        effort,
      },
    },
  },
});

export const updateClaudeDefaultModel = (
  settings: Settings,
  modelId: ClaudeModelAliasId
): Settings => ({
  ...settings,
  providers: {
    ...settings.providers,
    claude: {
      ...settings.providers.claude,
      defaultModel: modelId,
    },
  },
});

export const updateClaudeContinuityRemainingPercentThreshold = (
  settings: Settings,
  remainingPercentThreshold: number
): Settings => ({
  ...settings,
  providers: {
    ...settings.providers,
    claude: {
      ...settings.providers.claude,
      sessionContinuity: {
        ...settings.providers.claude.sessionContinuity,
        remainingPercentThreshold,
      },
    },
  },
});

export const updateCodexDefaultModel = (
  settings: Settings,
  modelId: CodexModelId
): Settings => ({
  ...settings,
  providers: {
    ...settings.providers,
    codex: {
      ...settings.providers.codex,
      defaultModel: modelId,
    },
  },
});

export const updateCodexReasoning = (
  settings: Settings,
  modelId: CodexModelId,
  reasoning: CodexReasoningLevel
): Settings => ({
  ...settings,
  providers: {
    ...settings.providers,
    codex: {
      ...settings.providers.codex,
      reasoningByModel: {
        ...settings.providers.codex.reasoningByModel,
        [modelId]: reasoning,
      },
    },
  },
});

export const updateThinkingDisplaySyncEnabled = (
  settings: Settings,
  provider:
    | "claude"
    | "codex"
    | "gemini"
    | "kimi"
    | "glmOpenCode"
    | "glmNative",
  enabled: boolean
): Settings => ({
  ...settings,
  providers: {
    ...settings.providers,
    [provider]: {
      ...settings.providers[provider],
      thinkingDisplaySyncEnabled: enabled,
      ...(provider === "codex" ? { reasoningSummaryEnabled: enabled } : {}),
    },
  },
});

export const updateKimiDefaultModel = (
  settings: Settings,
  defaultModel: KimiModelId = DEFAULT_KIMI_MODEL_ID
): Settings => ({
  ...settings,
  providers: {
    ...settings.providers,
    kimi: {
      ...(settings.providers.kimi ?? {
        autoUpdate: { enabled: false },
        thinkingDisplaySyncEnabled: true,
        thinkingEnabled: true,
      }),
      defaultModel,
    },
  },
});

export const updateLocalModelsDefaultModel = (
  settings: Settings,
  defaultModel: string
): Settings => ({
  ...settings,
  providers: {
    ...settings.providers,
    localModels: {
      ...(settings.providers.localModels ?? {}),
      defaultModel: defaultModel.trim() || "local-model",
    },
  },
});

export const updateCodexContinuityRemainingPercentThreshold = (
  settings: Settings,
  remainingPercentThreshold: number
): Settings => ({
  ...settings,
  providers: {
    ...settings.providers,
    codex: {
      ...settings.providers.codex,
      sessionContinuity: {
        ...settings.providers.codex.sessionContinuity,
        remainingPercentThreshold,
      },
    },
  },
});

export const updateProviderAutoUpdate = (
  settings: Settings,
  provider: ProviderId,
  enabled: boolean
): Settings => ({
  ...settings,
  providers: {
    ...settings.providers,
    [provider]: {
      ...settings.providers[provider],
      autoUpdate: {
        enabled,
      },
    },
  },
});

export const updateGeminiDefaultModel = (
  settings: Settings,
  modelId: GeminiModelId
): Settings => ({
  ...settings,
  providers: {
    ...settings.providers,
    gemini: {
      ...settings.providers.gemini,
      defaultModel: modelId,
    },
  },
});

export const updateGeminiThinking = (
  settings: Settings,
  modelId: GeminiModelId,
  level: GeminiThinkingLevel
): Settings => ({
  ...settings,
  providers: {
    ...settings.providers,
    gemini: {
      ...settings.providers.gemini,
      thinkingLevelByModel: {
        ...settings.providers.gemini.thinkingLevelByModel,
        [modelId]: level,
      },
    },
  },
});

export const updateGeminiContinuityRemainingPercentThreshold = (
  settings: Settings,
  remainingPercentThreshold: number
): Settings => ({
  ...settings,
  providers: {
    ...settings.providers,
    gemini: {
      ...settings.providers.gemini,
      sessionContinuity: {
        ...settings.providers.gemini.sessionContinuity,
        remainingPercentThreshold,
      },
    },
  },
});

export const updateGeminiContextWindowTokenLimit = (
  settings: Settings,
  contextWindowTokenLimit: number
): Settings => ({
  ...settings,
  providers: {
    ...settings.providers,
    gemini: {
      ...settings.providers.gemini,
      sessionContinuity: {
        ...settings.providers.gemini.sessionContinuity,
        contextWindowTokenLimit,
      },
    },
  },
});

export const updateResponsePolicyMode = (
  settings: Settings,
  mode: GeneralResponseMode
): Settings => ({
  ...settings,
  general: {
    ...settings.general,
    responsePolicy: {
      ...settings.general.responsePolicy,
      mode,
    },
  },
});

export const updateTextToSpeechRate = (
  settings: Settings,
  rate: number
): Settings => ({
  ...settings,
  general: {
    ...settings.general,
    textToSpeech: {
      ...settings.general.textToSpeech,
      rate,
    },
  },
});

export const updateStrictSchemaText = (
  settings: Settings,
  schemaText: string
): Settings => ({
  ...settings,
  general: {
    ...settings.general,
    responsePolicy: {
      ...settings.general.responsePolicy,
      strictOutput: {
        ...settings.general.responsePolicy.strictOutput,
        schemaText,
      },
    },
  },
});

export const updateStrictInstructionText = (
  settings: Settings,
  instructionText: string
): Settings => ({
  ...settings,
  general: {
    ...settings.general,
    responsePolicy: {
      ...settings.general.responsePolicy,
      strictOutput: {
        ...settings.general.responsePolicy.strictOutput,
        instructionText,
      },
    },
  },
});
