import {
  type ClaudeThinkingEffort,
  type CodexReasoningEffort,
  DEFAULT_CLAUDE_THINKING_EFFORT,
  DEFAULT_CODEX_REASONING_EFFORT,
  normalizeCodexModelFromSettings,
  normalizeCodexReasoningEffort,
  resolveClaudeDefaultModel,
  resolveClaudeThinkingFromSettings,
  resolveCodexReasoningFromSettings,
  resolveGeminiThinkingFromSettings,
  resolvePreferredCodexDefaultModel,
} from "./provider-defaults-resolver";
import {
  type ClaudeProviderSettingsSnapshot,
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
  readonly baseModelId: string;
  readonly defaultModel: string;
  readonly defaultReasoningEffort: CodexReasoningEffort;
  readonly effectiveModelId: string;
  readonly reasoningByModel: Record<string, CodexReasoningEffort>;
}

export interface ResolvedGeminiTurnConfig {
  readonly baseModelId?: string;
  readonly defaultModel?: string;
  readonly effectiveModelId?: string;
  readonly thinkingDisplaySyncEnabled: boolean;
  readonly thinkingLevelByModel: Record<string, string>;
}

export interface ResolvedClaudeTurnConfig {
  readonly baseModelId: string;
  readonly defaultModel: string;
  readonly effectiveModelId: string;
  readonly reasoningEffort?: ClaudeThinkingEffort;
  readonly thinkingDisplaySyncEnabled: boolean;
  readonly thinkingEnabled: boolean;
}

export interface ResolvedProviderTurnConfigEntry {
  readonly baseModelId?: string;
  readonly defaultModel?: string;
  readonly defaultReasoningEffort?: CodexReasoningEffort;
  readonly effectiveModelId?: string;
  readonly providerId: string;
  readonly reasoningByModel?: Record<string, CodexReasoningEffort>;
  readonly reasoningEffort?: string;
  readonly thinkingDisplaySyncEnabled?: boolean;
  readonly thinkingEnabled?: boolean;
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

const buildCodexEffectiveModelId = (
  baseModelId: string,
  reasoningEffort: CodexReasoningEffort
): string => `${baseModelId} reasoning:${reasoningEffort}`;

const buildGeminiEffectiveModelId = (
  baseModelId: string,
  thinkingLevel?: string
): string =>
  thinkingLevel ? `${baseModelId} thinking:${thinkingLevel}` : baseModelId;

const buildClaudeEffectiveModelId = (
  baseModelId: string,
  thinkingEnabled: boolean,
  reasoningEffort?: string
): string =>
  thinkingEnabled
    ? `${baseModelId} reasoning:${reasoningEffort ?? DEFAULT_CLAUDE_THINKING_EFFORT}`
    : `${baseModelId} thinking:off`;

const resolveClaudeThinkingDisplaySyncEnabled = (
  snapshot: ClaudeProviderSettingsSnapshot | null
): boolean => snapshot?.thinkingDisplaySyncEnabled !== false;

export const buildProviderEffectiveModelId = (options: {
  readonly baseModelId?: string;
  readonly providerId: string;
  readonly reasoningEffort?: string;
  readonly thinkingEnabled?: boolean;
  readonly thinkingLevel?: string;
}): string | undefined => {
  const baseModelId = normalizeOptionalString(options.baseModelId);
  if (!baseModelId) {
    return undefined;
  }

  if (options.providerId === "codexCli") {
    return buildCodexEffectiveModelId(
      baseModelId,
      normalizeCodexReasoningEffort(options.reasoningEffort) ??
        DEFAULT_CODEX_REASONING_EFFORT
    );
  }

  if (options.providerId === "geminiCli") {
    return buildGeminiEffectiveModelId(baseModelId, options.thinkingLevel);
  }

  if (options.providerId === "claudeCodeCli") {
    return buildClaudeEffectiveModelId(
      baseModelId,
      options.thinkingEnabled === true,
      options.reasoningEffort
    );
  }

  return baseModelId;
};

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
    baseModelId: defaultModel,
    defaultModel,
    defaultReasoningEffort,
    effectiveModelId: buildCodexEffectiveModelId(
      defaultModel,
      defaultReasoningEffort
    ),
    reasoningByModel,
  };
};

const resolveGeminiTurnConfig = (
  options: ProviderTurnConfigResolverOptions
): ResolvedGeminiTurnConfig => {
  const snapshot = loadGeminiSettingsSnapshot(options.settingsPath);
  const defaultModel =
    normalizeOptionalString(
      typeof snapshot?.defaultModel === "string"
        ? snapshot.defaultModel
        : undefined
    ) ??
    normalizeOptionalString(options.env.GEMINI_DEFAULT_MODEL) ??
    options.fallbackGeminiModel;
  const thinkingLevelByModel = resolveGeminiThinkingFromSettings(
    snapshot?.thinkingLevelByModel
  );
  const thinkingDisplaySyncEnabled =
    snapshot?.thinkingDisplaySyncEnabled !== false;

  return {
    baseModelId: defaultModel,
    defaultModel,
    effectiveModelId: defaultModel
      ? buildGeminiEffectiveModelId(
          defaultModel,
          thinkingLevelByModel[defaultModel]
        )
      : undefined,
    thinkingLevelByModel,
    thinkingDisplaySyncEnabled,
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
  const defaultModel =
    settingsDefaultModel ??
    normalizeOptionalString(options.env.CLAUDE_DEFAULT_MODEL) ??
    options.fallbackClaudeModel;
  const thinkingSettings = resolveClaudeThinkingFromSettings(
    snapshot?.thinking
  );
  const thinkingEnabled = thinkingSettings.enabled;
  const thinkingDisplaySyncEnabled =
    resolveClaudeThinkingDisplaySyncEnabled(snapshot);

  return {
    baseModelId: defaultModel,
    defaultModel,
    effectiveModelId: buildClaudeEffectiveModelId(
      defaultModel,
      thinkingEnabled,
      thinkingSettings.effort
    ),
    reasoningEffort: thinkingEnabled ? thinkingSettings.effort : undefined,
    thinkingDisplaySyncEnabled,
    thinkingEnabled,
  };
};

const buildResolvedProviderConfigRegistry = (resolved: {
  readonly claude: ResolvedClaudeTurnConfig;
  readonly codex: ResolvedCodexTurnConfig;
  readonly gemini: ResolvedGeminiTurnConfig;
}): Readonly<Record<string, ResolvedProviderTurnConfigEntry>> => ({
  claudeCodeCli: {
    providerId: "claudeCodeCli",
    baseModelId: resolved.claude.baseModelId,
    defaultModel: resolved.claude.defaultModel,
    effectiveModelId: resolved.claude.effectiveModelId,
    reasoningEffort: resolved.claude.reasoningEffort,
    thinkingEnabled: resolved.claude.thinkingEnabled,
    thinkingDisplaySyncEnabled: resolved.claude.thinkingDisplaySyncEnabled,
  },
  codexCli: {
    providerId: "codexCli",
    baseModelId: resolved.codex.baseModelId,
    defaultModel: resolved.codex.defaultModel,
    defaultReasoningEffort: resolved.codex.defaultReasoningEffort,
    effectiveModelId: resolved.codex.effectiveModelId,
    reasoningByModel: resolved.codex.reasoningByModel,
  },
  geminiCli: {
    providerId: "geminiCli",
    baseModelId: resolved.gemini.baseModelId,
    defaultModel: resolved.gemini.defaultModel,
    effectiveModelId: resolved.gemini.effectiveModelId,
    thinkingLevelByModel: resolved.gemini.thinkingLevelByModel,
    thinkingDisplaySyncEnabled: resolved.gemini.thinkingDisplaySyncEnabled,
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
