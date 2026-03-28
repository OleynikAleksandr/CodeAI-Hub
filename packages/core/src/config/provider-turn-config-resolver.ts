import type { CodexReasoningEffort } from "./provider-defaults-resolver";
import {
  normalizeCodexModelFromSettings,
  normalizeCodexReasoningEffort,
  resolveCodexReasoningFromSettings,
  resolveGeminiThinkingFromSettings,
  resolvePreferredCodexDefaultModel,
} from "./provider-defaults-resolver";
import {
  loadCodexSettingsSnapshot,
  loadGeminiSettingsSnapshot,
} from "./provider-settings-snapshot";

interface ProviderTurnConfigResolverOptions {
  readonly env: NodeJS.ProcessEnv;
  readonly fallbackCodexModel: string;
  readonly fallbackCodexReasoningEffort: CodexReasoningEffort;
  readonly fallbackGeminiModel?: string;
  readonly settingsPath: string;
}

export interface ResolvedCodexTurnConfig {
  readonly defaultModel: string;
  readonly defaultReasoningEffort: CodexReasoningEffort;
  readonly reasoningByModel: Record<string, CodexReasoningEffort>;
}

export interface ResolvedGeminiTurnConfig {
  readonly defaultModel?: string;
  readonly thinkingLevelByModel: Record<string, string>;
}

export interface ResolvedProviderTurnConfig {
  readonly codex: ResolvedCodexTurnConfig;
  readonly gemini: ResolvedGeminiTurnConfig;
}

const normalizeOptionalString = (
  value: string | undefined
): string | undefined => (value?.trim() ? value.trim() : undefined);

const resolveCodexTurnConfig = (
  options: ProviderTurnConfigResolverOptions
): ResolvedCodexTurnConfig => {
  const snapshot = loadCodexSettingsSnapshot(options.settingsPath);
  const settingsDefaultModel = normalizeCodexModelFromSettings(
    snapshot?.defaultModel
  );
  const reasoningByModel = resolveCodexReasoningFromSettings(
    snapshot?.reasoningByModel
  );
  const defaultModel = resolvePreferredCodexDefaultModel({
    settingsDefaultModel,
    envDefaultModel: options.env.CODEX_DEFAULT_MODEL,
    fallbackModel: options.fallbackCodexModel,
  });
  const defaultReasoningEffort =
    normalizeCodexReasoningEffort(options.env.CODEX_DEFAULT_REASONING_EFFORT) ??
    reasoningByModel[defaultModel] ??
    options.fallbackCodexReasoningEffort;

  return {
    defaultModel,
    defaultReasoningEffort,
    reasoningByModel,
  };
};

const resolveGeminiTurnConfig = (
  options: ProviderTurnConfigResolverOptions
): ResolvedGeminiTurnConfig => {
  const snapshot = loadGeminiSettingsSnapshot(options.settingsPath);

  return {
    defaultModel:
      normalizeOptionalString(
        typeof snapshot?.defaultModel === "string"
          ? snapshot.defaultModel
          : undefined
      ) ??
      normalizeOptionalString(options.env.GEMINI_DEFAULT_MODEL) ??
      options.fallbackGeminiModel,
    thinkingLevelByModel: resolveGeminiThinkingFromSettings(
      snapshot?.thinkingLevelByModel
    ),
  };
};

export const resolveProviderTurnConfig = (
  options: ProviderTurnConfigResolverOptions
): ResolvedProviderTurnConfig => ({
  codex: resolveCodexTurnConfig(options),
  gemini: resolveGeminiTurnConfig(options),
});
