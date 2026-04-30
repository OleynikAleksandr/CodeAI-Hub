import type {
  ClaudeModelAliasId,
  ClaudeThinkingEffort,
} from "../../../../types/claude-model-registry";
import type {
  CodexModelId,
  CodexReasoningLevel,
} from "../../../../types/codex-model-registry";
import { DEFAULT_CODEX_REASONING_LEVEL } from "../../../../types/codex-model-registry";
import type {
  GeminiModelId,
  GeminiThinkingLevel,
} from "../../../../types/gemini-model-registry";
import { DEFAULT_GEMINI_THINKING_LEVEL } from "../../../../types/gemini-model-registry";
import type { ProviderStackId } from "../../../../types/provider";
import {
  updateClaudeDefaultModel,
  updateCodexDefaultModel,
  updateCodexReasoning,
  updateGeminiDefaultModel,
  updateGeminiThinking,
  updateThinkingSettings,
} from "../../../ui/src/components/settings/settings-state-helpers";
import type { Settings } from "../../../ui/src/components/settings/settings-state-model";

interface SessionModelSwitchControllerDeps {
  readonly saveSettings: (settings: Settings) => void;
  readonly setSessionModel: (
    sessionId: string,
    targetModelId: string,
    targetReasoningId?: string | null
  ) => void;
}

export interface SessionModelSwitchRequest {
  readonly modelId: string;
  readonly providerId: ProviderStackId;
  readonly sessionId: string;
  readonly settings: Settings;
}

export interface SessionReasoningSwitchRequest {
  readonly modelId: string;
  readonly providerId: ProviderStackId;
  readonly reasoningId: string;
  readonly sessionId: string;
  readonly settings: Settings;
}

export interface SessionModelSwitchResult {
  readonly settings: Settings;
  readonly targetModelId: string;
  readonly targetReasoningId: string;
}

const CLAUDE_THINKING_OFF_ID = "off";

const normalizeRequiredString = (value: string): string | null => {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const resolveSettingsDefaultModel = (
  settings: Settings,
  providerId: ProviderStackId
): string => {
  if (providerId === "claudeCodeCli") {
    return settings.providers.claude.defaultModel;
  }
  if (providerId === "codexCli") {
    return settings.providers.codex.defaultModel;
  }
  return settings.providers.gemini.defaultModel;
};

export class SessionModelSwitchController {
  private readonly deps: SessionModelSwitchControllerDeps;

  constructor(deps: SessionModelSwitchControllerDeps) {
    this.deps = deps;
  }

  selectModel(
    request: SessionModelSwitchRequest
  ): SessionModelSwitchResult | null {
    const sessionId = normalizeRequiredString(request.sessionId);
    const modelId = normalizeRequiredString(request.modelId);
    if (!(sessionId && modelId)) {
      return null;
    }

    const settings = this.updateDefaultModel({
      modelId,
      providerId: request.providerId,
      settings: request.settings,
    });
    return this.commit({
      modelId,
      sessionId,
      settings,
      targetReasoningId: this.resolveSettingsReasoningId({
        modelId,
        providerId: request.providerId,
        settings,
      }),
    });
  }

  selectReasoning(
    request: SessionReasoningSwitchRequest
  ): SessionModelSwitchResult | null {
    const sessionId = normalizeRequiredString(request.sessionId);
    const reasoningId = normalizeRequiredString(request.reasoningId);
    const modelId =
      normalizeRequiredString(request.modelId) ??
      resolveSettingsDefaultModel(request.settings, request.providerId);
    if (!(sessionId && reasoningId)) {
      return null;
    }

    const settings = this.updateReasoning({
      modelId,
      providerId: request.providerId,
      reasoningId,
      settings: request.settings,
    });
    return this.commit({
      modelId,
      sessionId,
      settings,
      targetReasoningId: reasoningId,
    });
  }

  private updateDefaultModel(options: {
    readonly modelId: string;
    readonly providerId: ProviderStackId;
    readonly settings: Settings;
  }): Settings {
    if (options.providerId === "claudeCodeCli") {
      return updateClaudeDefaultModel(
        options.settings,
        options.modelId as ClaudeModelAliasId
      );
    }
    if (options.providerId === "codexCli") {
      return updateCodexDefaultModel(
        options.settings,
        options.modelId as CodexModelId
      );
    }
    return updateGeminiDefaultModel(
      options.settings,
      options.modelId as GeminiModelId
    );
  }

  private updateReasoning(options: {
    readonly modelId: string;
    readonly providerId: ProviderStackId;
    readonly reasoningId: string;
    readonly settings: Settings;
  }): Settings {
    if (options.providerId === "claudeCodeCli") {
      const currentEffort = options.settings.providers.claude.thinking.effort;
      return updateThinkingSettings(
        options.settings,
        options.reasoningId !== CLAUDE_THINKING_OFF_ID,
        options.reasoningId === CLAUDE_THINKING_OFF_ID
          ? currentEffort
          : (options.reasoningId as ClaudeThinkingEffort)
      );
    }
    if (options.providerId === "codexCli") {
      return updateCodexReasoning(
        options.settings,
        options.modelId as CodexModelId,
        options.reasoningId as CodexReasoningLevel
      );
    }
    return updateGeminiThinking(
      options.settings,
      options.modelId as GeminiModelId,
      options.reasoningId as GeminiThinkingLevel
    );
  }

  private commit(options: {
    readonly modelId: string;
    readonly sessionId: string;
    readonly settings: Settings;
    readonly targetReasoningId: string;
  }): SessionModelSwitchResult {
    this.deps.saveSettings(options.settings);
    this.deps.setSessionModel(
      options.sessionId,
      options.modelId,
      options.targetReasoningId
    );
    return {
      settings: options.settings,
      targetModelId: options.modelId,
      targetReasoningId: options.targetReasoningId,
    };
  }

  private resolveSettingsReasoningId(options: {
    readonly modelId: string;
    readonly providerId: ProviderStackId;
    readonly settings: Settings;
  }): string {
    if (options.providerId === "claudeCodeCli") {
      const thinking = options.settings.providers.claude.thinking;
      return thinking.enabled ? thinking.effort : CLAUDE_THINKING_OFF_ID;
    }
    if (options.providerId === "codexCli") {
      return (
        options.settings.providers.codex.reasoningByModel[options.modelId] ??
        DEFAULT_CODEX_REASONING_LEVEL
      );
    }
    return (
      options.settings.providers.gemini.thinkingLevelByModel[
        options.modelId
      ] ?? DEFAULT_GEMINI_THINKING_LEVEL
    );
  }
}
