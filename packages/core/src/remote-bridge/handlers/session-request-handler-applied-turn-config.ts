import path from "node:path";
import type { CoreConfig } from "../../config";
import { loadMessagesForTheUserLanguage } from "../../config/provider-settings-snapshot";
import {
  buildProviderEffectiveModelId,
  resolveProviderTurnConfigEntry,
} from "../../config/provider-turn-config-resolver";
import { resolveProviderModelSyncCapabilities } from "../../provider-registry/provider-descriptor-factory";
import {
  type AppliedProviderTurnConfig,
  withAppliedProviderTurnConfig,
} from "../types";

const SETTINGS_FILE_NAME = "settings.json";

export class SessionRequestHandlerAppliedTurnConfig {
  private readonly config: CoreConfig;

  constructor(config: CoreConfig) {
    this.config = config;
  }

  attachToTurnOptions(options: {
    readonly providerId: string;
    readonly targetModelId?: string;
    readonly turnOptions?: Record<string, unknown>;
  }): Record<string, unknown> | undefined {
    return withAppliedProviderTurnConfig(
      options.turnOptions,
      this.resolveForProvider(options.providerId, options.targetModelId)
    );
  }

  private resolveForProvider(
    providerId: string,
    targetModelId?: string
  ): AppliedProviderTurnConfig | null {
    const capabilities = resolveProviderModelSyncCapabilities(providerId);
    if (!capabilities.acceptsAppliedTurnConfig) {
      return null;
    }

    const settingsPath = this.resolveSharedSettingsPath();
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
      targetModelId ?? resolved.baseModelId ?? resolved.defaultModel;
    const reasoningEffort =
      baseModelId && resolved.reasoningByModel
        ? (resolved.reasoningByModel[baseModelId] ??
          resolved.defaultReasoningEffort)
        : (resolved.reasoningEffort ?? resolved.defaultReasoningEffort);
    const thinkingLevel =
      baseModelId && resolved.thinkingLevelByModel
        ? resolved.thinkingLevelByModel[baseModelId]
        : undefined;

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
      messagesForTheUserLanguage: loadMessagesForTheUserLanguage(settingsPath),
      modelId: baseModelId,
      reasoningEffort,
      source: targetModelId ? "switch_request" : "settings_snapshot",
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

  private resolveSharedSettingsPath(): string {
    return path.join(
      path.dirname(this.config.claudeSettingsPath),
      SETTINGS_FILE_NAME
    );
  }
}
