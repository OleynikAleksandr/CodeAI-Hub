import {
  CLAUDE_MODEL_ALIASES,
  CLAUDE_THINKING_EFFORTS,
  type ClaudeThinkingEffort,
} from "../../../../../types/claude-model-registry";
import {
  CODEX_REASONING_LEVELS,
  CODEX_SETTINGS_MODELS,
  type CodexReasoningLevel,
  DEFAULT_CODEX_REASONING_LEVEL,
} from "../../../../../types/codex-model-registry";
import {
  DEFAULT_GEMINI_THINKING_LEVEL,
  GEMINI_RECOMMENDED_MODELS,
  GEMINI_THINKING_LEVELS,
  type GeminiThinkingLevel,
} from "../../../../../types/gemini-model-registry";
import type { ProviderStackId } from "../../../../../types/provider";
import type { ModelInfo } from "../../../../../types/session";
import type { Settings } from "../../components/settings/settings-state-model";

export type SessionModelSwitcherProviderKey = "claude" | "codex" | "gemini";

export interface SessionModelSwitcherModelOption {
  readonly description: string;
  readonly id: string;
  readonly label: string;
  readonly selected: boolean;
}

export interface SessionModelSwitcherReasoningOption {
  readonly description: string;
  readonly id: string;
  readonly label: string;
  readonly selected: boolean;
}

export interface SessionModelSwitcherState {
  readonly effectiveModelId: string;
  readonly modelOptions: readonly SessionModelSwitcherModelOption[];
  readonly providerId: ProviderStackId;
  readonly providerKey: SessionModelSwitcherProviderKey;
  readonly reasoningOptions: readonly SessionModelSwitcherReasoningOption[];
  readonly selectedModelId: string;
  readonly selectedReasoningId: string;
}

export interface SessionModelSwitcherBuildOptions {
  readonly modelInfo?: ModelInfo | null;
  readonly providerId: ProviderStackId;
  readonly settings: Settings;
}

export interface SessionModelSwitcherSelection {
  readonly effectiveModelId: string;
  readonly modelId: string;
  readonly providerId: ProviderStackId;
  readonly providerKey: SessionModelSwitcherProviderKey;
  readonly reasoningId: string;
}

const PROVIDER_KEY_BY_ID: Record<
  ProviderStackId,
  SessionModelSwitcherProviderKey
> = {
  claudeCodeCli: "claude",
  codexCli: "codex",
  geminiCli: "gemini",
};

const EFFECTIVE_MODEL_ID_REGEX = /^(.*)\s+(reasoning|thinking):([^\s]+)$/;
const REASONING_TEXT_PREFIX_REGEX = /^(reasoning|thinking)\s+/u;
const CLAUDE_THINKING_OFF_ID = "off";

const parseEffectiveModelId = (
  modelId: string
): { readonly baseModelId: string; readonly reasoningId?: string } => {
  const normalized = modelId.trim();
  const match = EFFECTIVE_MODEL_ID_REGEX.exec(normalized);
  if (!match) {
    return { baseModelId: normalized };
  }

  return {
    baseModelId: match[1]?.trim() ?? normalized,
    reasoningId: match[3]?.trim(),
  };
};

const normalizeReasoningText = (value: string | undefined): string | null => {
  const normalized = value?.trim().replace(/[()]/g, "");
  if (!normalized) {
    return null;
  }
  return normalized.replace(REASONING_TEXT_PREFIX_REGEX, "").trim();
};

const findGeminiModel = (modelId: string) =>
  GEMINI_RECOMMENDED_MODELS.find((model) => model.id === modelId);

const findGeminiThinkingLevel = (levelId: string) =>
  GEMINI_THINKING_LEVELS.find((level) => level.name === levelId);

export class SessionModelSwitcherFacade {
  buildState(
    options: SessionModelSwitcherBuildOptions
  ): SessionModelSwitcherState {
    const providerKey = PROVIDER_KEY_BY_ID[options.providerId];
    const selectedModelId = this.resolveSelectedModelId({
      modelInfo: options.modelInfo,
      providerKey,
      settings: options.settings,
    });
    const selectedReasoningId = this.resolveSelectedReasoningId({
      modelInfo: options.modelInfo,
      modelId: selectedModelId,
      providerKey,
      settings: options.settings,
    });

    return {
      providerId: options.providerId,
      providerKey,
      selectedModelId,
      selectedReasoningId,
      effectiveModelId: this.buildEffectiveModelId({
        modelId: selectedModelId,
        providerKey,
        reasoningId: selectedReasoningId,
      }),
      modelOptions: this.buildModelOptions(providerKey, selectedModelId),
      reasoningOptions: this.buildReasoningOptions({
        modelId: selectedModelId,
        providerKey,
        selectedReasoningId,
      }),
    };
  }

  buildSelection(options: {
    readonly modelId: string;
    readonly providerId: ProviderStackId;
    readonly reasoningId: string;
  }): SessionModelSwitcherSelection {
    const providerKey = PROVIDER_KEY_BY_ID[options.providerId];
    const modelId = options.modelId.trim();
    const reasoningId = options.reasoningId.trim();
    return {
      providerId: options.providerId,
      providerKey,
      modelId,
      reasoningId,
      effectiveModelId: this.buildEffectiveModelId({
        modelId,
        providerKey,
        reasoningId,
      }),
    };
  }

  private resolveSelectedModelId(options: {
    readonly modelInfo?: ModelInfo | null;
    readonly providerKey: SessionModelSwitcherProviderKey;
    readonly settings: Settings;
  }): string {
    const modelId = options.modelInfo?.modelId;
    if (modelId) {
      return parseEffectiveModelId(modelId).baseModelId;
    }

    return options.settings.providers[options.providerKey].defaultModel;
  }

  private resolveSelectedReasoningId(options: {
    readonly modelId: string;
    readonly modelInfo?: ModelInfo | null;
    readonly providerKey: SessionModelSwitcherProviderKey;
    readonly settings: Settings;
  }): string {
    const parsed = options.modelInfo?.modelId
      ? parseEffectiveModelId(options.modelInfo.modelId).reasoningId
      : null;
    return (
      parsed ??
      normalizeReasoningText(options.modelInfo?.reasoning) ??
      this.resolveSettingsReasoningId(options)
    );
  }

  private resolveSettingsReasoningId(options: {
    readonly modelId: string;
    readonly providerKey: SessionModelSwitcherProviderKey;
    readonly settings: Settings;
  }): string {
    if (options.providerKey === "claude") {
      const thinking = options.settings.providers.claude.thinking;
      return thinking.enabled ? thinking.effort : CLAUDE_THINKING_OFF_ID;
    }
    if (options.providerKey === "codex") {
      return (
        options.settings.providers.codex.reasoningByModel[options.modelId] ??
        DEFAULT_CODEX_REASONING_LEVEL
      );
    }
    return (
      options.settings.providers.gemini.thinkingLevelByModel[options.modelId] ??
      DEFAULT_GEMINI_THINKING_LEVEL
    );
  }

  private buildModelOptions(
    providerKey: SessionModelSwitcherProviderKey,
    selectedModelId: string
  ): readonly SessionModelSwitcherModelOption[] {
    if (providerKey === "claude") {
      return CLAUDE_MODEL_ALIASES.map((model) => ({
        id: model.alias,
        label: model.displayName,
        description: model.description,
        selected: model.alias === selectedModelId,
      }));
    }
    if (providerKey === "codex") {
      return CODEX_SETTINGS_MODELS.map((model) => ({
        id: model.id,
        label: model.displayName,
        description: model.description,
        selected: model.id === selectedModelId,
      }));
    }
    return GEMINI_RECOMMENDED_MODELS.map((model) => ({
      id: model.id,
      label: model.displayName,
      description: model.description,
      selected: model.id === selectedModelId,
    }));
  }

  private buildReasoningOptions(options: {
    readonly modelId: string;
    readonly providerKey: SessionModelSwitcherProviderKey;
    readonly selectedReasoningId: string;
  }): readonly SessionModelSwitcherReasoningOption[] {
    if (options.providerKey === "claude") {
      return [
        {
          id: CLAUDE_THINKING_OFF_ID,
          label: "off",
          description: "Disable Claude thinking for this session.",
          selected: options.selectedReasoningId === CLAUDE_THINKING_OFF_ID,
        },
        ...CLAUDE_THINKING_EFFORTS.map((effort) => ({
          id: effort.name,
          label: effort.name,
          description: effort.description,
          selected: effort.name === options.selectedReasoningId,
        })),
      ];
    }
    if (options.providerKey === "codex") {
      return CODEX_REASONING_LEVELS.map((level) => ({
        id: level.name,
        label: level.name,
        description: level.description,
        selected: level.name === options.selectedReasoningId,
      }));
    }
    const model = findGeminiModel(options.modelId);
    const levels = model?.supportedThinkingLevels ?? [
      DEFAULT_GEMINI_THINKING_LEVEL,
    ];
    return levels.map((levelId) => {
      const level = findGeminiThinkingLevel(levelId);
      return {
        id: levelId,
        label: levelId,
        description: level?.description ?? "",
        selected: levelId === options.selectedReasoningId,
      };
    });
  }

  private buildEffectiveModelId(options: {
    readonly modelId: string;
    readonly providerKey: SessionModelSwitcherProviderKey;
    readonly reasoningId: string;
  }): string {
    if (options.providerKey === "codex") {
      return `${options.modelId} reasoning:${options.reasoningId as CodexReasoningLevel}`;
    }
    if (options.providerKey === "gemini") {
      return `${options.modelId} thinking:${options.reasoningId as GeminiThinkingLevel}`;
    }
    if (options.reasoningId === CLAUDE_THINKING_OFF_ID) {
      return `${options.modelId} thinking:off`;
    }
    return `${options.modelId} reasoning:${options.reasoningId as ClaudeThinkingEffort}`;
  }
}
