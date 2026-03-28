import path from "node:path";
import type { CoreConfig } from "../../config";
import { resolveProviderTurnConfig } from "../../config/provider-turn-config-resolver";
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
    const resolved = resolveProviderTurnConfig({
      settingsPath: this.resolveSharedSettingsPath(),
      env: process.env,
      fallbackCodexModel: this.config.codexDefaultModel ?? "gpt-5.3-codex",
      fallbackCodexReasoningEffort:
        this.config.codexDefaultReasoningEffort ?? "medium",
      fallbackGeminiModel: this.config.geminiDefaultModel,
    });

    if (providerId === "codexCli") {
      const modelId = targetModelId ?? resolved.codex.defaultModel;
      return {
        providerId,
        modelId,
        reasoningEffort:
          resolved.codex.reasoningByModel[modelId] ??
          resolved.codex.defaultReasoningEffort,
        source: targetModelId ? "switch_request" : "settings_snapshot",
      };
    }

    if (providerId === "geminiCli") {
      const modelId = targetModelId ?? resolved.gemini.defaultModel;
      return {
        providerId,
        modelId,
        thinkingLevel: modelId
          ? resolved.gemini.thinkingLevelByModel[modelId]
          : undefined,
        source: targetModelId ? "switch_request" : "settings_snapshot",
      };
    }

    return null;
  }

  private resolveSharedSettingsPath(): string {
    return path.join(
      path.dirname(this.config.claudeSettingsPath),
      SETTINGS_FILE_NAME
    );
  }
}
