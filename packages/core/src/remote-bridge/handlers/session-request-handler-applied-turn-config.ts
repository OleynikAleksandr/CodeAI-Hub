import type { CoreConfig } from "../../config";
import { loadArtifactsForTheUserLanguage } from "../../config/provider-settings-snapshot";
import {
  buildProviderEffectiveModelId,
  resolveProviderTurnConfigEntry,
} from "../../config/provider-turn-config-resolver";
import { resolveProviderModelSyncCapabilities } from "../../provider-registry/provider-descriptor-factory";
import type { SessionModelBinding } from "../../session-model-binding";
import { SessionTranslationPolicyResolver } from "../../session-translation/session-translation-policy-resolver";
import { resolveWorkspaceRuntimeCapsule } from "../../workflow/runtime/workspace-runtime-capsule";
import {
  type AppliedProviderTurnConfig,
  withAppliedProviderTurnConfig,
} from "../types";

const translationPolicyResolver = new SessionTranslationPolicyResolver();

const resolveDefaultSettingsPath = (config: CoreConfig): string =>
  resolveWorkspaceRuntimeCapsule({
    workspaceRoot: config.claudeWorkspacePath ?? process.cwd(),
    workspaceSlug: config.claudeProjectSlug,
  }).settingsFile.absolutePath;

export class SessionRequestHandlerAppliedTurnConfig {
  private readonly config: CoreConfig;

  constructor(config: CoreConfig) {
    this.config = config;
  }

  attachToTurnOptions(options: {
    readonly providerId: string;
    readonly sessionModelBinding?: SessionModelBinding | null;
    readonly targetModelId?: string;
    readonly targetReasoningEffort?: string;
    readonly turnOptions?: Record<string, unknown>;
  }): Record<string, unknown> | undefined {
    return withAppliedProviderTurnConfig(
      options.turnOptions,
      this.resolveForProvider({
        providerId: options.providerId,
        sessionModelBinding: options.sessionModelBinding,
        targetModelId: options.targetModelId,
        targetReasoningEffort: options.targetReasoningEffort,
      })
    );
  }

  resolveEffectiveModelId(
    providerId: string,
    targetModelId?: string,
    targetReasoningEffort?: string
  ): string | undefined {
    return this.resolveForProvider({
      providerId,
      targetModelId,
      targetReasoningEffort,
    })?.effectiveModelId;
  }

  private resolveForProvider(options: {
    readonly providerId: string;
    readonly sessionModelBinding?: SessionModelBinding | null;
    readonly targetModelId?: string;
    readonly targetReasoningEffort?: string;
  }): AppliedProviderTurnConfig | null {
    const providerId = options.providerId;
    const capabilities = resolveProviderModelSyncCapabilities(providerId);
    if (!capabilities.acceptsAppliedTurnConfig) {
      return null;
    }

    const settingsPath = this.resolveSettingsPath(
      options.sessionModelBinding,
      providerId
    );
    if (options.sessionModelBinding?.providerId === providerId) {
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
      fallbackCodexModel: this.config.codexDefaultModel ?? "gpt-5.4-mini",
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
      options.targetReasoningEffort ??
      (baseModelId && resolved.reasoningByModel
        ? (resolved.reasoningByModel[baseModelId] ??
          resolved.defaultReasoningEffort)
        : (resolved.reasoningEffort ?? resolved.defaultReasoningEffort));
    const thinkingLevel =
      baseModelId && resolved.thinkingLevelByModel
        ? resolved.thinkingLevelByModel[baseModelId]
        : undefined;
    const translationPolicy = translationPolicyResolver.resolve(settingsPath);
    const artifactsForTheUserLanguage =
      loadArtifactsForTheUserLanguage(settingsPath);
    const reasoningLanguage =
      translationPolicy.targetLanguage ?? translationPolicy.sourceLanguage;
    const reasoningEngineId = translationPolicy.engineId;

    return {
      providerId,
      artifactsForTheUserLanguage,
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
    const artifactsForTheUserLanguage = loadArtifactsForTheUserLanguage(
      options.settingsPath
    );
    const reasoningLanguage =
      translationPolicy.targetLanguage ?? translationPolicy.sourceLanguage;
    const reasoningEngineId = translationPolicy.engineId;

    return {
      providerId: options.providerId,
      artifactsForTheUserLanguage,
      baseModelId: options.binding.baseModelId,
      effectiveModelId: options.binding.modelId,
      messagesForTheUserLanguage: reasoningLanguage,
      modelId: options.binding.baseModelId ?? options.binding.modelId,
      reasoningEffort: options.binding.reasoningEffort,
      reasoningEngineId,
      reasoningLanguage,
      source: "session_binding",
      translationEngineId: reasoningEngineId,
      thinkingEnabled: options.binding.thinkingEnabled,
      thinkingLevel: options.binding.thinkingLevel,
    };
  }

  private resolveSharedSettingsPath(): string {
    return resolveDefaultSettingsPath(this.config);
  }

  private resolveSettingsPath(
    binding: SessionModelBinding | null | undefined,
    providerId: string
  ): string {
    return binding?.providerId === providerId && binding.settingsPath
      ? binding.settingsPath
      : this.resolveSharedSettingsPath();
  }
}
