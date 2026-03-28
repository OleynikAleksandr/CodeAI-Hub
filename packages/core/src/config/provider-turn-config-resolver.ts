import type { CodexReasoningEffort } from "./provider-defaults-resolver";
import {
  normalizeCodexModelFromSettings,
  normalizeCodexReasoningEffort,
  resolveClaudeDefaultModel,
  resolveCodexReasoningFromSettings,
  resolveGeminiThinkingFromSettings,
  resolvePreferredCodexDefaultModel,
} from "./provider-defaults-resolver";
import {
  loadClaudeProviderSettingsSnapshot,
  loadCodexSettingsSnapshot,
  loadGeminiSettingsSnapshot,
} from "./provider-settings-snapshot";

interface ProviderTurnConfigResolverOptions {
  readonly env: NodeJS.ProcessEnv;
  readonly fallbackClaudeModel: string;
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

export interface ResolvedClaudeTurnConfig {
  readonly defaultModel: string;
}

export interface ResolvedProviderTurnConfigEntry {
  readonly defaultModel?: string;
  readonly defaultReasoningEffort?: CodexReasoningEffort;
  readonly providerId: string;
  readonly reasoningByModel?: Record<string, CodexReasoningEffort>;
  readonly thinkingLevelByModel?: Record<string, string>;
}

export interface ResolvedProviderTurnConfig {
  readonly byProviderId: Readonly<
    Record<string, ResolvedProviderTurnConfigEntry>
  >;
  readonly claude: ResolvedClaudeTurnConfig;
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

const resolveClaudeTurnConfig = (
  options: ProviderTurnConfigResolverOptions
): ResolvedClaudeTurnConfig => {
  const snapshot = loadClaudeProviderSettingsSnapshot(options.settingsPath);
  const settingsDefaultModel =
    typeof snapshot?.defaultModel === "string"
      ? resolveClaudeDefaultModel(snapshot.defaultModel)
      : undefined;

  return {
    defaultModel:
      settingsDefaultModel ??
      normalizeOptionalString(options.env.CLAUDE_DEFAULT_MODEL) ??
      options.fallbackClaudeModel,
  };
};

const buildResolvedProviderConfigRegistry = (resolved: {
  readonly claude: ResolvedClaudeTurnConfig;
  readonly codex: ResolvedCodexTurnConfig;
  readonly gemini: ResolvedGeminiTurnConfig;
}): Readonly<Record<string, ResolvedProviderTurnConfigEntry>> => ({
  claudeCodeCli: {
    providerId: "claudeCodeCli",
    defaultModel: resolved.claude.defaultModel,
  },
  codexCli: {
    providerId: "codexCli",
    defaultModel: resolved.codex.defaultModel,
    defaultReasoningEffort: resolved.codex.defaultReasoningEffort,
    reasoningByModel: resolved.codex.reasoningByModel,
  },
  geminiCli: {
    providerId: "geminiCli",
    defaultModel: resolved.gemini.defaultModel,
    thinkingLevelByModel: resolved.gemini.thinkingLevelByModel,
  },
});

export const resolveProviderTurnConfig = (
  options: ProviderTurnConfigResolverOptions
): ResolvedProviderTurnConfig => {
  const claude = resolveClaudeTurnConfig(options);
  const codex = resolveCodexTurnConfig(options);
  const gemini = resolveGeminiTurnConfig(options);

  return {
    claude,
    codex,
    gemini,
    byProviderId: buildResolvedProviderConfigRegistry({
      claude,
      codex,
      gemini,
    }),
  };
};

export const resolveProviderTurnConfigEntry = (
  options: ProviderTurnConfigResolverOptions & {
    readonly providerId: string;
  }
): ResolvedProviderTurnConfigEntry | null =>
  resolveProviderTurnConfig(options).byProviderId[options.providerId] ?? null;
