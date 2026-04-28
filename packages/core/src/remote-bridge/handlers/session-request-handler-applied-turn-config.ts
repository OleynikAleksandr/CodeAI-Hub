import path from "node:path";
import type { CoreConfig } from "../../config";
import {
  buildProviderEffectiveModelId,
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

export class SessionRequestHandlerAppliedTurnConfig {
  private readonly config: CoreConfig;

  constructor(config: CoreConfig) {
    this.config = config;
  }

  attachToTurnOptions(options: {
    readonly providerId: string;
    readonly sessionModelBinding?: SessionModelBinding | null;
    readonly targetModelId?: string;
    readonly turnOptions?: Record<string, unknown>;
  }): Record<string, unknown> | undefined {
    return withAppliedProviderTurnConfig(
      options.turnOptions,
      this.resolveForProvider({
        providerId: options.providerId,
        sessionModelBinding: options.sessionModelBinding,
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
    const reasoningEffort =
      baseModelId && resolved.reasoningByModel
        ? (resolved.reasoningByModel[baseModelId] ??
          resolved.defaultReasoningEffort)
        : (resolved.reasoningEffort ?? resolved.defaultReasoningEffort);
    const thinkingLevel =
      baseModelId && resolved.thinkingLevelByModel
        ? resolved.thinkingLevelByModel[baseModelId]
        : undefined;
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
          thinkingEnabled: resolved.thinkingEnabled,
          thinkingLevel,
        }) ?? resolved.effectiveModelId,
      messagesForTheUserLanguage: reasoningLanguage,
      modelId: baseModelId,
      reasoningEffort,
      reasoningEngineId,
      reasoningLanguage,
      source: options.targetModelId ? "switch_request" : "settings_snapshot",
      translationEngineId: reasoningEngineId,
      ...(resolved.thinkingEnabled === undefined
        ? {}
        : { thinkingEnabled: resolved.thinkingEnabled }),
      thinkingLevel,
      ...(resolved.thinkingDisplaySyncEnabled === undefined
        ? {}
        : {
            thinkingDisplaySyncEnabled: resolved.thinkingDisplaySyncEnabled,
          }),
    };
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
