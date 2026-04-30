import path from "node:path";
import type { CoreConfig } from "../../config";
import {
  buildProviderEffectiveModelId,
  type ResolvedProviderTurnConfigEntry,
  resolveProviderTurnConfigEntry,
} from "../../config/provider-turn-config-resolver";
import { resolveProviderModelSyncCapabilities } from "../../provider-registry/provider-descriptor-factory";
import type { SessionModelBinding } from "../../session-model-binding";
import { SessionTranslationPolicyResolver } from "../../session-translation/session-translation-policy-resolver";
import {
  type AppliedProviderTurnConfig,
  withAppliedProviderTurnConfig,
} from "../types";

const SETTINGS_FILE_NAME = "settings.json";
const translationPolicyResolver = new SessionTranslationPolicyResolver();
const CLAUDE_THINKING_OFF_ID = "off";

const normalizeOptionalString = (value: string | null | undefined) => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
};

export class SessionRequestHandlerAppliedTurnConfig {
  private readonly config: CoreConfig;

  constructor(config: CoreConfig) {
    this.config = config;
  }

  attachToTurnOptions(options: {
    readonly providerId: string;
    readonly sessionModelBinding?: SessionModelBinding | null;
    readonly targetReasoningId?: string | null;
    readonly targetModelId?: string;
    readonly turnOptions?: Record<string, unknown>;
  }): Record<string, unknown> | undefined {
    return withAppliedProviderTurnConfig(
      options.turnOptions,
      this.resolveForProvider({
        providerId: options.providerId,
        sessionModelBinding: options.sessionModelBinding,
        targetReasoningId: options.targetReasoningId,
        targetModelId: options.targetModelId,
      })
    );
  }

  resolveEffectiveModelId(
    providerId: string,
    targetModelId?: string
  ): string | undefined {
    return this.resolveForProvider({ providerId, targetModelId })
      ?.effectiveModelId;
  }

  private resolveForProvider(options: {
    readonly providerId: string;
    readonly sessionModelBinding?: SessionModelBinding | null;
    readonly targetReasoningId?: string | null;
    readonly targetModelId?: string;
  }): AppliedProviderTurnConfig | null {
    const providerId = options.providerId;
    const capabilities = resolveProviderModelSyncCapabilities(providerId);
    if (!capabilities.acceptsAppliedTurnConfig) {
      return null;
    }

    const settingsPath = this.resolveSharedSettingsPath();
    if (!options.targetModelId && options.sessionModelBinding) {
      return this.resolveFromSessionBinding({
        binding: options.sessionModelBinding,
        providerId,
        settingsPath,
      });
    }

    const resolved = resolveProviderTurnConfigEntry({
      settingsPath,
      env: process.env,
      providerId,
      fallbackClaudeModel: this.config.claudeDefaultModel,
      fallbackCodexModel: this.config.codexDefaultModel ?? "gpt-5.3-codex",
      fallbackCodexReasoningEffort:
        this.config.codexDefaultReasoningEffort ?? "medium",
      fallbackGeminiModel: this.config.geminiDefaultModel,
    });
    if (!resolved) {
      return null;
    }

    const baseModelId =
      options.targetModelId ?? resolved.baseModelId ?? resolved.defaultModel;
    const explicitReasoningId = normalizeOptionalString(
      options.targetReasoningId
    );
    const settingsReasoningEffort = this.resolveSettingsReasoningEffort(
      resolved,
      baseModelId
    );
    const thinkingEnabled = this.resolveThinkingEnabled({
      explicitReasoningId,
      providerId,
      resolved,
    });
    const reasoningEffort = this.resolveReasoningEffort({
      explicitReasoningId,
      providerId,
      settingsReasoningEffort,
      thinkingEnabled,
    });
    const thinkingLevel = this.resolveThinkingLevel({
      baseModelId,
      explicitReasoningId,
      providerId,
      resolved,
    });
    const translationPolicy = translationPolicyResolver.resolve(settingsPath);
    const reasoningLanguage =
      translationPolicy.targetLanguage ?? translationPolicy.sourceLanguage;
    const reasoningEngineId = translationPolicy.engineId;

    return {
      providerId,
      baseModelId,
      effectiveModelId:
        buildProviderEffectiveModelId({
          providerId,
          baseModelId,
          reasoningEffort,
          thinkingEnabled,
          thinkingLevel,
        }) ?? resolved.effectiveModelId,
      messagesForTheUserLanguage: reasoningLanguage,
      modelId: baseModelId,
      reasoningEffort,
      reasoningEngineId,
      reasoningLanguage,
      source: options.targetModelId ? "switch_request" : "settings_snapshot",
      translationEngineId: reasoningEngineId,
      ...(thinkingEnabled === undefined ? {} : { thinkingEnabled }),
      thinkingLevel,
      ...(resolved.thinkingDisplaySyncEnabled === undefined
        ? {}
        : {
            thinkingDisplaySyncEnabled: resolved.thinkingDisplaySyncEnabled,
          }),
    };
  }

  private resolveSettingsReasoningEffort(
    resolved: ResolvedProviderTurnConfigEntry,
    baseModelId: string | undefined
  ): string | undefined {
    if (baseModelId && resolved.reasoningByModel) {
      return (
        resolved.reasoningByModel[baseModelId] ??
        resolved.defaultReasoningEffort
      );
    }
    return resolved.reasoningEffort ?? resolved.defaultReasoningEffort;
  }

  private resolveThinkingEnabled(options: {
    readonly explicitReasoningId: string | undefined;
    readonly providerId: string;
    readonly resolved: ResolvedProviderTurnConfigEntry;
  }): boolean | undefined {
    if (options.providerId === "claudeCodeCli" && options.explicitReasoningId) {
      return options.explicitReasoningId !== CLAUDE_THINKING_OFF_ID;
    }
    return options.resolved.thinkingEnabled;
  }

  private resolveReasoningEffort(options: {
    readonly explicitReasoningId: string | undefined;
    readonly providerId: string;
    readonly settingsReasoningEffort: string | undefined;
    readonly thinkingEnabled: boolean | undefined;
  }): string | undefined {
    if (options.providerId === "geminiCli") {
      return options.settingsReasoningEffort;
    }
    if (
      options.explicitReasoningId &&
      options.explicitReasoningId !== CLAUDE_THINKING_OFF_ID
    ) {
      return options.explicitReasoningId;
    }
    if (options.thinkingEnabled === false) {
      return undefined;
    }
    return options.settingsReasoningEffort;
  }

  private resolveThinkingLevel(options: {
    readonly baseModelId: string | undefined;
    readonly explicitReasoningId: string | undefined;
    readonly providerId: string;
    readonly resolved: ResolvedProviderTurnConfigEntry;
  }): string | undefined {
    if (options.providerId === "geminiCli" && options.explicitReasoningId) {
      return options.explicitReasoningId;
    }
    if (options.baseModelId && options.resolved.thinkingLevelByModel) {
      return options.resolved.thinkingLevelByModel[options.baseModelId];
    }
    return undefined;
  }

  private resolveFromSessionBinding(options: {
    readonly binding: SessionModelBinding;
    readonly providerId: string;
    readonly settingsPath: string;
  }): AppliedProviderTurnConfig {
    const translationPolicy = translationPolicyResolver.resolve(
      options.settingsPath
    );
    const reasoningLanguage =
      translationPolicy.targetLanguage ?? translationPolicy.sourceLanguage;
    const reasoningEngineId = translationPolicy.engineId;

    return {
      providerId: options.providerId,
      baseModelId: options.binding.baseModelId,
      effectiveModelId: options.binding.modelId,
      messagesForTheUserLanguage: reasoningLanguage,
      modelId: options.binding.baseModelId ?? options.binding.modelId,
      reasoningEffort: options.binding.reasoningEffort,
      reasoningEngineId,
      reasoningLanguage,
      source: "settings_snapshot",
      translationEngineId: reasoningEngineId,
      thinkingEnabled: options.binding.thinkingEnabled,
      thinkingLevel: options.binding.thinkingLevel,
    };
  }

  private resolveSharedSettingsPath(): string {
    return path.join(
      path.dirname(this.config.claudeSettingsPath),
      SETTINGS_FILE_NAME
    );
  }
}
