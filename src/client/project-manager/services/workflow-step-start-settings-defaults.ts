import {
  CLAUDE_MODEL_ALIAS_SET,
  CLAUDE_THINKING_EFFORT_SET,
  type ClaudeModelAliasId,
  type ClaudeThinkingEffort,
} from "../../../types/claude-model-registry";
import {
  CODEX_REASONING_LEVELS,
  CODEX_SETTINGS_MODELS,
  type CodexModelId,
  type CodexReasoningLevel,
} from "../../../types/codex-model-registry";
import {
  GEMINI_MODEL_ID_SET,
  GEMINI_THINKING_LEVELS,
  type GeminiModelId,
  type GeminiThinkingLevel,
} from "../../../types/gemini-model-registry";
import {
  DEFAULT_KIMI_MODEL_ID,
  KIMI_MODEL_ID_SET,
  type KimiModelId,
} from "../../../types/kimi-model-registry";
import type { ProviderStackId } from "../../../types/provider";
import type { Settings } from "../../ui/src/components/settings/settings-state-model";
import {
  updateClaudeDefaultModel,
  updateCodexDefaultModel,
  updateCodexReasoning,
  updateGeminiDefaultModel,
  updateGeminiThinking,
  updateLocalModelsDefaultModel,
  updateThinkingSettings,
} from "../../ui/src/components/settings/settings-state-helpers";

const CODEX_MODEL_ID_SET = new Set<string>(
  CODEX_SETTINGS_MODELS.map((model) => model.id)
);
const CODEX_REASONING_LEVEL_SET = new Set<string>(
  CODEX_REASONING_LEVELS.map((level) => level.name)
);
const GEMINI_THINKING_LEVEL_SET = new Set<string>(
  GEMINI_THINKING_LEVELS.map((level) => level.name)
);

const normalizeStartCardSelection = (
  value: string | null | undefined
): string | null => {
  const normalized = typeof value === "string" ? value.trim() : "";
  return normalized.length > 0 ? normalized : null;
};

const isClaudeModelAliasId = (value: string): value is ClaudeModelAliasId =>
  CLAUDE_MODEL_ALIAS_SET.has(value as ClaudeModelAliasId);

const isClaudeThinkingEffort = (
  value: string
): value is ClaudeThinkingEffort =>
  CLAUDE_THINKING_EFFORT_SET.has(value as ClaudeThinkingEffort);

const isCodexModelId = (value: string): value is CodexModelId =>
  CODEX_MODEL_ID_SET.has(value);

const isCodexReasoningLevel = (
  value: string
): value is CodexReasoningLevel => CODEX_REASONING_LEVEL_SET.has(value);

const isGeminiModelId = (value: string): value is GeminiModelId =>
  GEMINI_MODEL_ID_SET.has(value as GeminiModelId);

const isGeminiThinkingLevel = (
  value: string
): value is GeminiThinkingLevel => GEMINI_THINKING_LEVEL_SET.has(value);

const isKimiModelId = (value: string): value is KimiModelId =>
  KIMI_MODEL_ID_SET.has(value as KimiModelId);

const isGlmModelId = (value: string): boolean =>
  value === "zai-coding-plan/glm-5.2" ||
  value === "kimi-for-coding/k2p7";

const applyClaudeStartDefaults = (
  settings: Settings,
  modelId: string | null,
  reasoning: string | null
): Settings | null => {
  let changed = false;
  let nextSettings = settings;
  if (modelId && isClaudeModelAliasId(modelId)) {
    if (settings.providers.claude.defaultModel !== modelId) {
      nextSettings = updateClaudeDefaultModel(nextSettings, modelId);
      changed = true;
    }
  }
  if (reasoning && isClaudeThinkingEffort(reasoning)) {
    const currentThinking = settings.providers.claude.thinking;
    if (!currentThinking.enabled || currentThinking.effort !== reasoning) {
      nextSettings = updateThinkingSettings(nextSettings, true, reasoning);
      changed = true;
    }
  }
  return changed ? nextSettings : null;
};

const applyCodexStartDefaults = (
  settings: Settings,
  modelId: string | null,
  reasoning: string | null
): Settings | null => {
  if (!modelId || !isCodexModelId(modelId)) {
    return null;
  }
  let changed = false;
  let nextSettings = settings;
  if (settings.providers.codex.defaultModel !== modelId) {
    nextSettings = updateCodexDefaultModel(nextSettings, modelId);
    changed = true;
  }
  if (
    reasoning &&
    isCodexReasoningLevel(reasoning) &&
    settings.providers.codex.reasoningByModel[modelId] !== reasoning
  ) {
    nextSettings = updateCodexReasoning(nextSettings, modelId, reasoning);
    changed = true;
  }
  return changed ? nextSettings : null;
};

const applyKimiStartDefaults = (
  settings: Settings,
  modelId: string | null
): Settings | null => {
  if (!modelId || !isKimiModelId(modelId)) {
    return null;
  }
  if (settings.providers.kimi?.defaultModel === modelId) {
    return null;
  }
  return {
    ...settings,
    providers: {
      ...settings.providers,
      kimi: {
        ...(settings.providers.kimi ?? {
          autoUpdate: { enabled: false },
          defaultModel: DEFAULT_KIMI_MODEL_ID,
          thinkingDisplaySyncEnabled: true,
        }),
        defaultModel: modelId,
      },
    },
  };
};

const applyGlmStartDefaults = (
  settings: Settings,
  modelId: string | null
): Settings | null => {
  if (!modelId || !isGlmModelId(modelId)) {
    return null;
  }
  const currentProviderSettings = settings.providers.glmOpenCode;
  if (currentProviderSettings?.defaultModel === modelId) {
    return null;
  }
  return {
    ...settings,
    providers: {
      ...settings.providers,
      glmOpenCode: {
        ...(currentProviderSettings ?? {
          apiKey: "",
          configPath: "~/.codeai-hub/providers/opencode/config.json",
          defaultModel: "zai-coding-plan/glm-5.2",
          thinkingDisplaySyncEnabled: true,
        }),
        defaultModel: modelId,
      },
    },
  };
};

const applyGlmNativeStartDefaults = (
  settings: Settings,
  modelId: string | null
): Settings | null => {
  if (modelId !== "glm-5.2") {
    return null;
  }
  const currentProviderSettings = settings.providers.glmNative;
  if (currentProviderSettings?.defaultModel === modelId) {
    return null;
  }
  return {
    ...settings,
    providers: {
      ...settings.providers,
      glmNative: {
        ...(currentProviderSettings ?? {
          apiKey: "",
          baseUrl: "https://api.z.ai/api/coding/paas/v4",
          defaultModel: "glm-5.2",
          thinkingDisplaySyncEnabled: true,
        }),
        defaultModel: modelId,
      },
    },
  };
};

const applyGeminiStartDefaults = (
  settings: Settings,
  modelId: string | null,
  reasoning: string | null
): Settings | null => {
  if (!modelId || !isGeminiModelId(modelId)) {
    return null;
  }
  let changed = false;
  let nextSettings = settings;
  if (settings.providers.gemini.defaultModel !== modelId) {
    nextSettings = updateGeminiDefaultModel(nextSettings, modelId);
    changed = true;
  }
  if (
    reasoning &&
    isGeminiThinkingLevel(reasoning) &&
    settings.providers.gemini.thinkingLevelByModel[modelId] !== reasoning
  ) {
    nextSettings = updateGeminiThinking(nextSettings, modelId, reasoning);
    changed = true;
  }
  return changed ? nextSettings : null;
};

const applyLocalModelsStartDefaults = (
  settings: Settings,
  modelId: string | null
): Settings | null => {
  if (!modelId || settings.providers.localModels?.defaultModel === modelId) {
    return null;
  }
  return updateLocalModelsDefaultModel(settings, modelId);
};

export const applyStartCardModelDefaults = (
  settings: Settings,
  params: Pick<StartWorkflowStepParams, "modelId" | "providerId" | "reasoning">
): Settings | null => {
  const modelId = normalizeStartCardSelection(params.modelId);
  const reasoning = normalizeStartCardSelection(params.reasoning);
  if (!modelId && !reasoning) {
    return null;
  }

  if (params.providerId === "claudeCodeCli") {
    return applyClaudeStartDefaults(settings, modelId, reasoning);
  }
  if (params.providerId === "codexCli") {
    return applyCodexStartDefaults(settings, modelId, reasoning);
  }
  if (params.providerId === "localModels") {
    return applyLocalModelsStartDefaults(settings, modelId);
  }
  if (params.providerId === "kimiCode") {
    return applyKimiStartDefaults(settings, modelId);
  }
  if (params.providerId === "glmOpenCode") {
    return applyGlmStartDefaults(settings, modelId);
  }
  if (params.providerId === "glmNative") {
    return applyGlmNativeStartDefaults(settings, modelId);
  }
  return applyGeminiStartDefaults(settings, modelId, reasoning);
};

type StartWorkflowStepParams = {
  readonly modelId?: string | null;
  readonly providerId: ProviderStackId;
  readonly reasoning?: string | null;
};
