import type { ClaudeModelAliasId } from "../../../../../types/claude-model-registry";
import type {
  GeminiModelId,
  GeminiThinkingLevel,
} from "../../../../../types/gemini-model-registry";
import type {
  CodexModelId,
  CodexReasoningLevel,
  ProviderId,
  Settings,
} from "./settings-state-model";

export const updateThinkingSettings = (
  settings: Settings,
  enabled: boolean,
  maxTokens: number
): Settings => ({
  ...settings,
  providers: {
    ...settings.providers,
    claude: {
      ...settings.providers.claude,
      thinking: {
        enabled,
        maxTokens,
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
