import type { ProviderStackId } from "../../../../types/provider";
import { getDefaultProviderTitle } from "../../../../types/provider";
import type {
  ModelInfo,
  SessionModelBindingInfo,
} from "../../../../types/session";
import type { Settings } from "../components/settings/settings-state-model";

type ProviderKey = "claude" | "codex" | "gemini";
type SettingsBackedProviderId = "claudeCodeCli" | "codexCli" | "geminiCli";

const KIMI_DEFAULT_MODEL_DISPLAY_NAME = "Kimi K2.7 Code";
const GLM_CLAUDE_CODE_MODEL_DISPLAY_NAME = "GLM 5.2 / Claude Code";
const GLM_CLAUDE_CODE_MODEL_ID = "glm-5.2";
const KIMI_DEFAULT_MODEL_ID = "kimi-k2.7-code";
const LOCAL_MODELS_DEFAULT_MODEL_ID = "local-model";

const PROVIDER_ID_TO_KEY: Record<SettingsBackedProviderId, ProviderKey> = {
  claudeCodeCli: "claude",
  codexCli: "codex",
  geminiCli: "gemini",
};

// Regex patterns at top level for performance
const SINGLE_DIGIT_REGEX = /^\d+$/;
const DECIMAL_VERSION_REGEX = /^\d+\.\d+$/;
const VERSION_JOIN_REGEX = /(\d+)\s+(\d+)/g;
const EFFECTIVE_MODEL_ID_REGEX = /^(.*)\s+(reasoning|thinking):([^\s]+)$/;

interface EffectiveModelDescriptor {
  readonly baseModelId: string;
  readonly label?: string;
}

const parseEffectiveModelId = (modelId: string): EffectiveModelDescriptor => {
  const trimmed = modelId.trim();
  const match = EFFECTIVE_MODEL_ID_REGEX.exec(trimmed);
  if (!match) {
    return { baseModelId: trimmed };
  }

  const [, baseModelId, modifier, value] = match;
  return {
    baseModelId,
    label: modifier === "thinking" ? `thinking ${value}` : value,
  };
};

const isSettingsBackedProviderId = (
  providerId: ProviderStackId
): providerId is SettingsBackedProviderId =>
  providerId === "claudeCodeCli" ||
  providerId === "codexCli" ||
  providerId === "geminiCli";

const formatKimiSessionModelDisplayName = (
  providerId: ProviderStackId,
  modelId: string
): string => {
  const baseModelId = resolveKimiBaseModelId(modelId);
  if (providerId === "glmClaudeCode") {
    return baseModelId === GLM_CLAUDE_CODE_MODEL_ID
      ? GLM_CLAUDE_CODE_MODEL_DISPLAY_NAME
      : formatModelDisplayName(baseModelId);
  }
  if (baseModelId !== KIMI_DEFAULT_MODEL_ID) {
    return formatModelDisplayName(baseModelId);
  }
  return KIMI_DEFAULT_MODEL_DISPLAY_NAME;
};

const resolveFallbackModelDisplayName = (
  providerId: ProviderStackId,
  modelId: string
): string => {
  if (providerId === "kimiCode" || providerId === "glmClaudeCode") {
    return formatKimiSessionModelDisplayName(providerId, modelId);
  }
  if (!isSettingsBackedProviderId(providerId)) {
    return formatModelDisplayName(parseEffectiveModelId(modelId).baseModelId);
  }
  return resolveModelDisplayName(PROVIDER_ID_TO_KEY[providerId], modelId);
};

const resolveKimiBaseModelId = (modelId: string): string =>
  parseEffectiveModelId(modelId).baseModelId;

const formatClaudeSessionModelDisplayName = (modelId: string): string => {
  const { baseModelId } = parseEffectiveModelId(modelId);
  // Claude uses alias ids in settings ("default", "sonnet", "opus", "haiku").
  // In Session UI we want to show the effective family name, not "Default".
  if (baseModelId === "default" || baseModelId === "sonnet") {
    return "Sonnet";
  }

  return formatModelDisplayName(baseModelId);
};

const formatModelDisplayName = (modelId: string): string => {
  // Convert model IDs like "claude-opus-4-5" to "Claude Opus 4.5"
  // or "gpt-5.3-codex" to "GPT 5.3 Codex"
  return modelId
    .split("-")
    .map((part, index) => {
      // Check if part is a version number like "4" or "5"
      if (SINGLE_DIGIT_REGEX.test(part)) {
        return part;
      }
      // Check if part is a version with decimal like "5.2"
      if (DECIMAL_VERSION_REGEX.test(part)) {
        return part;
      }
      // Capitalize first letter
      return index === 0 || part.length > 2
        ? part.charAt(0).toUpperCase() + part.slice(1)
        : part.toUpperCase();
    })
    .join(" ")
    .replace(VERSION_JOIN_REGEX, "$1.$2"); // Join version numbers like "4 5" -> "4.5"
};

const resolveModelDisplayName = (
  providerKey: ProviderKey,
  modelId: string
): string =>
  providerKey === "claude"
    ? formatClaudeSessionModelDisplayName(modelId)
    : formatModelDisplayName(parseEffectiveModelId(modelId).baseModelId);

const resolveModelReasoning = (
  providerKey: ProviderKey,
  modelId: string,
  settings: Settings
): string | undefined => {
  const effectiveModel = parseEffectiveModelId(modelId);
  if (effectiveModel.label) {
    return effectiveModel.label;
  }
  if (providerKey === "claude") {
    return settings.providers.claude.thinking.enabled
      ? settings.providers.claude.thinking.effort
      : "thinking off";
  }
  if (providerKey === "codex") {
    const codexReasoning = settings.providers.codex.reasoningByModel[modelId];
    return codexReasoning ? `reasoning ${codexReasoning}` : undefined;
  }
  const geminiThinking =
    settings.providers.gemini.thinkingLevelByModel[modelId];
  return geminiThinking ? `thinking ${geminiThinking}` : undefined;
};

export const buildModelInfo = (
  providerId: ProviderStackId,
  settings: Settings | null,
  modelIdOverride?: string,
  source: ModelInfo["source"] = "settings"
): ModelInfo => {
  const effectiveModelId =
    typeof modelIdOverride === "string" && modelIdOverride.trim().length > 0
      ? modelIdOverride.trim()
      : null;

  if (!settings) {
    const fallbackModelId = effectiveModelId ?? "unknown";
    const effectiveModel = parseEffectiveModelId(fallbackModelId);
    return {
      providerId,
      providerName: getDefaultProviderTitle(providerId),
      modelId: fallbackModelId,
      modelDisplayName: effectiveModelId
        ? resolveFallbackModelDisplayName(providerId, fallbackModelId)
        : getDefaultProviderTitle(providerId),
      ...(effectiveModel.label ? { reasoning: effectiveModel.label } : {}),
      source,
    };
  }

  if (providerId === "kimiCode" || providerId === "glmClaudeCode") {
    const settingsModelId =
      providerId === "glmClaudeCode"
        ? settings.providers.glmClaudeCode?.defaultModel
        : settings.providers.kimi?.defaultModel;
    const modelId =
      effectiveModelId ??
      settingsModelId ??
      (providerId === "glmClaudeCode"
        ? GLM_CLAUDE_CODE_MODEL_ID
        : KIMI_DEFAULT_MODEL_ID);
    return {
      providerId,
      providerName: getDefaultProviderTitle(providerId),
      modelId,
      modelDisplayName: formatKimiSessionModelDisplayName(providerId, modelId),
      source,
    };
  }
  if (providerId === "localModels") {
    const modelId =
      effectiveModelId ??
      settings.providers.localModels?.defaultModel ??
      LOCAL_MODELS_DEFAULT_MODEL_ID;
    return {
      providerId,
      providerName: getDefaultProviderTitle(providerId),
      modelId,
      modelDisplayName: formatModelDisplayName(
        parseEffectiveModelId(modelId).baseModelId
      ),
      source,
    };
  }
  if (!isSettingsBackedProviderId(providerId)) {
    const modelId = effectiveModelId ?? "unknown";
    return {
      providerId,
      providerName: getDefaultProviderTitle(providerId),
      modelId,
      modelDisplayName: formatModelDisplayName(
        parseEffectiveModelId(modelId).baseModelId
      ),
      source,
    };
  }

  const providerKey = PROVIDER_ID_TO_KEY[providerId];
  const providerName = getDefaultProviderTitle(providerId);
  const providerSettings = settings.providers[providerKey];
  const modelId = effectiveModelId ?? providerSettings.defaultModel;

  return {
    providerId,
    providerName,
    modelId,
    modelDisplayName: resolveModelDisplayName(providerKey, modelId),
    reasoning: resolveModelReasoning(providerKey, modelId, settings),
    source,
  };
};

export const buildModelInfoFromBinding = (
  binding: SessionModelBindingInfo,
  settings: Settings | null
): ModelInfo =>
  buildModelInfo(binding.providerId, settings, binding.modelId, "binding");

/**
 * Build ModelInfo array from session provider IDs and settings.
 */
export const buildModelInfoList = (
  providerIds: readonly ProviderStackId[],
  settings: Settings | null
): readonly ModelInfo[] => {
  return providerIds.map((providerId) => buildModelInfo(providerId, settings));
};
