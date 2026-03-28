import path from "node:path";
import type { CoreConfig } from "../../config";
import { resolveProviderTurnConfigEntry } from "../../config/provider-turn-config-resolver";
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

    const resolved = resolveProviderTurnConfigEntry({
      settingsPath: this.resolveSharedSettingsPath(),
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

    const modelId = targetModelId ?? resolved.defaultModel;
    return {
      providerId,
      modelId,
      reasoningEffort:
        modelId && resolved.reasoningByModel
          ? (resolved.reasoningByModel[modelId] ??
            resolved.defaultReasoningEffort)
          : resolved.defaultReasoningEffort,
      source: targetModelId ? "switch_request" : "settings_snapshot",
      thinkingLevel:
        modelId && resolved.thinkingLevelByModel
          ? resolved.thinkingLevelByModel[modelId]
          : undefined,
    };
  }

  private resolveSharedSettingsPath(): string {
    return path.join(
      path.dirname(this.config.claudeSettingsPath),
      SETTINGS_FILE_NAME
    );
  }
}
