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
  loadGlmClaudeCodeSettingsSnapshot,
  loadGlmOpenCodeSettingsSnapshot,
  loadKimiSettingsSnapshot,
  loadLocalModelsSettingsSnapshot,
} from "./provider-settings-snapshot";

export interface ProviderTurnConfigResolverOptions {
  readonly env: NodeJS.ProcessEnv;
  readonly fallbackClaudeModel: string;
  readonly fallbackCodexModel: string;
  readonly fallbackCodexReasoningEffort: CodexReasoningEffort;
  readonly fallbackGeminiModel?: string;
  readonly fallbackKimiModel?: string;
  readonly settingsPath: string;
}

export interface ResolvedCodexTurnConfig {
  readonly baseModelId: string;
  readonly defaultModel: string;
  readonly defaultReasoningEffort: CodexReasoningEffort;
  readonly effectiveModelId: string;
  readonly reasoningByModel: Record<string, CodexReasoningEffort>;
  readonly thinkingDisplaySyncEnabled: boolean;
}

export interface ResolvedGeminiTurnConfig {
  readonly baseModelId?: string;
  readonly defaultModel?: string;
  readonly effectiveModelId?: string;
  readonly thinkingDisplaySyncEnabled: boolean;
  readonly thinkingLevelByModel: Record<string, string>;
}

export interface ResolvedKimiTurnConfig {
  readonly baseModelId: string;
  readonly defaultModel: string;
  readonly effectiveModelId: string;
  readonly thinkingDisplaySyncEnabled: boolean;
}

interface SimpleProviderSettingsSnapshot {
  readonly defaultModel?: unknown;
  readonly thinkingDisplaySyncEnabled?: unknown;
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
  readonly glmClaudeCode: ResolvedKimiTurnConfig;
  readonly glmOpenCode: ResolvedKimiTurnConfig;
  readonly kimi: ResolvedKimiTurnConfig;
  readonly localModels: ResolvedKimiTurnConfig;
}

export interface ResolvedProviderEffectiveModelIdentity {
  readonly baseModelId?: string;
  readonly modelId: string;
  readonly reasoningEffort?: string;
  readonly thinkingDisplaySyncEnabled?: boolean;
  readonly thinkingEnabled?: boolean;
  readonly thinkingLevel?: string;
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

const DEFAULT_KIMI_MODEL_ID = "kimi-k2.7-code";
const DEFAULT_GLM_CLAUDE_CODE_MODEL_ID = "glm-5.2";
const DEFAULT_GLM_OPENCODE_MODEL_ID = "glm-5.2";
const DEFAULT_LOCAL_MODELS_MODEL_ID = "local-model";

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
  const thinkingDisplaySyncEnabled =
    snapshot?.reasoningSummaryEnabled !== false &&
    snapshot?.thinkingDisplaySyncEnabled !== false;

  return {
    baseModelId: defaultModel,
    defaultModel,
    defaultReasoningEffort,
    effectiveModelId: buildCodexEffectiveModelId(
      defaultModel,
      defaultReasoningEffort
    ),
    reasoningByModel,
    thinkingDisplaySyncEnabled,
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

const resolveKimiTurnConfig = (
  options: ProviderTurnConfigResolverOptions
): ResolvedKimiTurnConfig =>
  resolveSimpleProviderTurnConfig({
    envDefaultModel: options.env.KIMI_DEFAULT_MODEL,
    fallbackModel: options.fallbackKimiModel ?? DEFAULT_KIMI_MODEL_ID,
    snapshot: loadKimiSettingsSnapshot(options.settingsPath),
  });

const resolveSimpleProviderTurnConfig = (options: {
  readonly envDefaultModel?: string;
  readonly fallbackModel: string;
  readonly snapshot: SimpleProviderSettingsSnapshot | null;
}): ResolvedKimiTurnConfig => {
  const defaultModel =
    normalizeOptionalString(
      typeof options.snapshot?.defaultModel === "string"
        ? options.snapshot.defaultModel
        : undefined
    ) ??
    normalizeOptionalString(options.envDefaultModel) ??
    options.fallbackModel;

  return {
    baseModelId: defaultModel,
    defaultModel,
    effectiveModelId: defaultModel,
    thinkingDisplaySyncEnabled:
      options.snapshot?.thinkingDisplaySyncEnabled !== false,
  };
};

const resolveGlmClaudeCodeTurnConfig = (
  options: ProviderTurnConfigResolverOptions
): ResolvedKimiTurnConfig =>
  resolveSimpleProviderTurnConfig({
    envDefaultModel: options.env.GLM_CLAUDE_CODE_DEFAULT_MODEL,
    fallbackModel: DEFAULT_GLM_CLAUDE_CODE_MODEL_ID,
    snapshot: loadGlmClaudeCodeSettingsSnapshot(options.settingsPath),
  });

const resolveGlmOpenCodeTurnConfig = (
  options: ProviderTurnConfigResolverOptions
): ResolvedKimiTurnConfig =>
  resolveSimpleProviderTurnConfig({
    envDefaultModel: options.env.GLM_OPENCODE_DEFAULT_MODEL,
    fallbackModel: DEFAULT_GLM_OPENCODE_MODEL_ID,
    snapshot: loadGlmOpenCodeSettingsSnapshot(options.settingsPath),
  });

const resolveLocalModelsTurnConfig = (
  options: ProviderTurnConfigResolverOptions
): ResolvedKimiTurnConfig => {
  const snapshot = loadLocalModelsSettingsSnapshot(options.settingsPath);
  const defaultModel =
    normalizeOptionalString(
      typeof snapshot?.defaultModel === "string"
        ? snapshot.defaultModel
        : undefined
    ) ??
    normalizeOptionalString(options.env.CODEAI_LMSTUDIO_DEFAULT_MODEL) ??
    DEFAULT_LOCAL_MODELS_MODEL_ID;

  return {
    baseModelId: defaultModel,
    defaultModel,
    effectiveModelId: defaultModel,
    thinkingDisplaySyncEnabled: true,
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
  readonly kimi: ResolvedKimiTurnConfig;
  readonly glmClaudeCode: ResolvedKimiTurnConfig;
  readonly glmOpenCode: ResolvedKimiTurnConfig;
  readonly localModels: ResolvedKimiTurnConfig;
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
    thinkingDisplaySyncEnabled: resolved.codex.thinkingDisplaySyncEnabled,
  },
  geminiCli: {
    providerId: "geminiCli",
    baseModelId: resolved.gemini.baseModelId,
    defaultModel: resolved.gemini.defaultModel,
    effectiveModelId: resolved.gemini.effectiveModelId,
    thinkingLevelByModel: resolved.gemini.thinkingLevelByModel,
    thinkingDisplaySyncEnabled: resolved.gemini.thinkingDisplaySyncEnabled,
  },
  kimiCode: {
    providerId: "kimiCode",
    baseModelId: resolved.kimi.baseModelId,
    defaultModel: resolved.kimi.defaultModel,
    effectiveModelId: resolved.kimi.effectiveModelId,
    thinkingDisplaySyncEnabled: resolved.kimi.thinkingDisplaySyncEnabled,
  },
  glmClaudeCode: {
    providerId: "glmClaudeCode",
    baseModelId: resolved.glmClaudeCode.baseModelId,
    defaultModel: resolved.glmClaudeCode.defaultModel,
    effectiveModelId: resolved.glmClaudeCode.effectiveModelId,
    thinkingDisplaySyncEnabled:
      resolved.glmClaudeCode.thinkingDisplaySyncEnabled,
  },
  glmOpenCode: {
    providerId: "glmOpenCode",
    baseModelId: resolved.glmOpenCode.baseModelId,
    defaultModel: resolved.glmOpenCode.defaultModel,
    effectiveModelId: resolved.glmOpenCode.effectiveModelId,
    thinkingDisplaySyncEnabled: resolved.glmOpenCode.thinkingDisplaySyncEnabled,
  },
  localModels: {
    providerId: "localModels",
    baseModelId: resolved.localModels.baseModelId,
    defaultModel: resolved.localModels.defaultModel,
    effectiveModelId: resolved.localModels.effectiveModelId,
    thinkingDisplaySyncEnabled: resolved.localModels.thinkingDisplaySyncEnabled,
  },
});

const resolveProviderTurnConfig = (
  options: ProviderTurnConfigResolverOptions
): ResolvedProviderTurnConfig => {
  const claude = resolveClaudeTurnConfig(options);
  const codex = resolveCodexTurnConfig(options);
  const gemini = resolveGeminiTurnConfig(options);
  const kimi = resolveKimiTurnConfig(options);
  const glmClaudeCode = resolveGlmClaudeCodeTurnConfig(options);
  const glmOpenCode = resolveGlmOpenCodeTurnConfig(options);
  const localModels = resolveLocalModelsTurnConfig(options);

  return {
    claude,
    codex,
    gemini,
    kimi,
    glmClaudeCode,
    glmOpenCode,
    localModels,
    byProviderId: buildResolvedProviderConfigRegistry({
      claude,
      codex,
      gemini,
      kimi,
      glmClaudeCode,
      glmOpenCode,
      localModels,
    }),
  };
};

export const resolveProviderTurnConfigEntry = (
  options: ProviderTurnConfigResolverOptions & {
    readonly providerId: string;
  }
): ResolvedProviderTurnConfigEntry | null =>
  resolveProviderTurnConfig(options).byProviderId[options.providerId] ?? null;

export const resolveProviderEffectiveModelIdentity = (options: {
  readonly providerId: string;
  readonly resolved: ResolvedProviderTurnConfigEntry;
  readonly targetModelId?: string;
}): ResolvedProviderEffectiveModelIdentity | null => {
  const baseModelId =
    normalizeOptionalString(options.targetModelId) ??
    options.resolved.baseModelId ??
    options.resolved.defaultModel;
  const reasoningEffort =
    baseModelId && options.resolved.reasoningByModel
      ? (options.resolved.reasoningByModel[baseModelId] ??
        options.resolved.defaultReasoningEffort)
      : (options.resolved.reasoningEffort ??
        options.resolved.defaultReasoningEffort);
  const thinkingLevel =
    baseModelId && options.resolved.thinkingLevelByModel
      ? options.resolved.thinkingLevelByModel[baseModelId]
      : undefined;
  const modelId =
    buildProviderEffectiveModelId({
      providerId: options.providerId,
      baseModelId,
      reasoningEffort,
      thinkingEnabled: options.resolved.thinkingEnabled,
      thinkingLevel,
    }) ?? options.resolved.effectiveModelId;

  if (!modelId) {
    return null;
  }

  return {
    baseModelId,
    modelId,
    reasoningEffort,
    thinkingDisplaySyncEnabled: options.resolved.thinkingDisplaySyncEnabled,
    thinkingEnabled: options.resolved.thinkingEnabled,
    thinkingLevel,
  };
};
