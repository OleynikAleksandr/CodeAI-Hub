import type { CSSProperties } from "react";
import {
  CLAUDE_MODEL_ALIASES,
  DEFAULT_CLAUDE_MODEL_ALIAS,
} from "../../../../types/claude-model-registry";
import {
  CODEX_SETTINGS_MODELS,
  type CodexReasoningLevel,
} from "../../../../types/codex-model-registry";
import { KIMI_RECOMMENDED_MODELS } from "../../../../types/kimi-model-registry";
import type { ProviderStackId } from "../../../../types/provider";

export type StatusPanelPickerMode = "model" | "reasoning";

export interface StatusPanelLocalModelOption {
  readonly displayName: string;
  readonly id: string;
}

interface StatusPanelModelPickerProps {
  readonly anchorLeft: number;
  readonly currentModelId: string;
  readonly currentReasoning?: string;
  readonly localModelOptions?: readonly StatusPanelLocalModelOption[];
  readonly mode: StatusPanelPickerMode;
  readonly onClose: () => void;
  readonly onSelectModel?: (modelId: string) => void;
  readonly onSelectReasoning?: (reasoning: string) => void;
  readonly providerId: ProviderStackId;
}

const EFFECTIVE_MODEL_SUFFIX_PATTERN = /\s+(reasoning|thinking):[^\s]+$/;
const REASONING_PREFIX_PATTERN = /^(reasoning|thinking)\s+/;
const OPENCODE_MODELS = [
  {
    defaultReasoning: "default",
    displayName: "GLM 5.2 / Z.AI Coding Plan",
    id: "zai-coding-plan/glm-5.2",
    reasoningOptions: ["default"],
  },
  {
    defaultReasoning: "default",
    displayName: "Kimi K2.7 / Kimi For Coding",
    id: "kimi-for-coding/k2p7",
    reasoningOptions: ["default"],
  },
] as const;
const GLM_NATIVE_MODELS = [
  {
    defaultReasoning: "default",
    displayName: "GLM 5.2 / GLM",
    id: "glm-5.2",
    reasoningOptions: ["default"],
  },
] as const;

const OPEN_CODE_MODEL_ALIASES: Readonly<Record<string, string>> = {
  "glm-5.2": "zai-coding-plan/glm-5.2",
  "kimi-k2.7-code": "kimi-for-coding/k2p7",
  k2p7: "kimi-for-coding/k2p7",
};

const FALLBACK_OPENCODE_MODEL = {
  defaultReasoning: "default",
  displayName: "Custom OpenCode model",
  id: "zai-coding-plan/glm-5.2",
  reasoningOptions: ["default"],
} as const;

interface PickerModelOption {
  readonly defaultReasoning: string;
  readonly displayName: string;
  readonly id: string;
  readonly reasoningOptions: readonly string[];
}

interface PickerConfig {
  readonly currentModel: PickerModelOption;
  readonly currentReasoning: string;
  readonly models: readonly PickerModelOption[];
}

const pickerStyle = (anchorLeft: number): CSSProperties => ({
  left: `${Math.max(0, anchorLeft)}px`,
});

const normalizeBaseModelId = (modelId: string): string =>
  modelId.replace(EFFECTIVE_MODEL_SUFFIX_PATTERN, "");

const normalizeReasoningValue = (
  currentReasoning: string | undefined
): string => currentReasoning?.replace(REASONING_PREFIX_PATTERN, "") ?? "";

const isCodexReasoning = (value: string): value is CodexReasoningLevel =>
  value === "low" ||
  value === "medium" ||
  value === "high" ||
  value === "xhigh";

const buildCodexConfig = (
  currentModelId: string,
  currentReasoning: string | undefined
): PickerConfig => {
  const baseModelId = normalizeBaseModelId(currentModelId);
  const currentModel =
    CODEX_SETTINGS_MODELS.find((model) => model.id === baseModelId) ??
    CODEX_SETTINGS_MODELS[0];
  const normalizedReasoning = normalizeReasoningValue(currentReasoning);
  const activeReasoning = isCodexReasoning(normalizedReasoning)
    ? normalizedReasoning
    : currentModel.reasoningEffortOptions[0];

  return {
    currentModel: {
      id: currentModel.id,
      displayName: currentModel.displayName,
      reasoningOptions: currentModel.reasoningEffortOptions,
      defaultReasoning: currentModel.reasoningEffortOptions[0],
    },
    currentReasoning: activeReasoning,
    models: CODEX_SETTINGS_MODELS.map((model) => ({
      id: model.id,
      displayName: model.displayName,
      reasoningOptions: model.reasoningEffortOptions,
      defaultReasoning: model.reasoningEffortOptions[0],
    })),
  };
};

const buildClaudeConfig = (
  currentModelId: string,
  currentReasoning: string | undefined
): PickerConfig => {
  const baseModelId = normalizeBaseModelId(currentModelId);
  const modelId =
    baseModelId === "default" ? DEFAULT_CLAUDE_MODEL_ALIAS : baseModelId;
  const currentModel =
    CLAUDE_MODEL_ALIASES.find((model) => model.alias === modelId) ??
    CLAUDE_MODEL_ALIASES[0];
  const normalizedReasoning = normalizeReasoningValue(currentReasoning);
  const effortOptions = ["off", ...currentModel.thinkingEffortOptions];
  const activeReasoning = effortOptions.includes(normalizedReasoning)
    ? normalizedReasoning
    : currentModel.defaultThinkingEffort;

  return {
    currentModel: {
      id: currentModel.alias,
      displayName: currentModel.displayName,
      reasoningOptions: effortOptions,
      defaultReasoning: currentModel.defaultThinkingEffort,
    },
    currentReasoning: activeReasoning,
    models: CLAUDE_MODEL_ALIASES.map((model) => ({
      id: model.alias,
      displayName: model.displayName,
      reasoningOptions: ["off", ...model.thinkingEffortOptions],
      defaultReasoning: model.defaultThinkingEffort,
    })),
  };
};

const buildKimiConfig = (currentModelId: string): PickerConfig => {
  const baseModelId = normalizeBaseModelId(currentModelId);
  const currentModel =
    KIMI_RECOMMENDED_MODELS.find((model) => model.id === baseModelId) ??
    KIMI_RECOMMENDED_MODELS[0];
  return {
    currentModel: {
      id: currentModel.id,
      displayName: currentModel.displayName,
      reasoningOptions: ["default"],
      defaultReasoning: "default",
    },
    currentReasoning: "default",
    models: KIMI_RECOMMENDED_MODELS.map((model) => ({
      id: model.id,
      displayName: model.displayName,
      reasoningOptions: ["default"],
      defaultReasoning: "default",
    })),
  };
};

const buildGlmOpenCodeConfig = (currentModelId: string): PickerConfig => {
  const baseModelId = normalizeBaseModelId(currentModelId);
  const normalizedModelId = OPEN_CODE_MODEL_ALIASES[baseModelId] ?? baseModelId;
  const knownModel = OPENCODE_MODELS.find(
    (model) => model.id === normalizedModelId
  );
  const currentModel =
    knownModel ??
    (normalizedModelId
      ? {
          ...FALLBACK_OPENCODE_MODEL,
          displayName: normalizedModelId,
          id: normalizedModelId,
        }
      : OPENCODE_MODELS[0]);
  const models = knownModel
    ? OPENCODE_MODELS
    : [currentModel, ...OPENCODE_MODELS];
  return {
    currentModel,
    currentReasoning: "default",
    models,
  };
};

const buildGlmNativeConfig = (): PickerConfig => ({
  currentModel: GLM_NATIVE_MODELS[0],
  currentReasoning: "default",
  models: GLM_NATIVE_MODELS,
});

const buildLocalModelsConfig = (
  currentModelId: string,
  localModelOptions: readonly StatusPanelLocalModelOption[] = []
): PickerConfig => {
  const baseModelId = normalizeBaseModelId(currentModelId);
  const models =
    localModelOptions.length > 0
      ? localModelOptions.map((model) => ({
          id: model.id,
          displayName: model.displayName,
          reasoningOptions: ["default"],
          defaultReasoning: "default",
        }))
      : [
          {
            id: baseModelId,
            displayName: baseModelId,
            reasoningOptions: ["default"],
            defaultReasoning: "default",
          },
        ];
  return {
    currentModel: models.find((model) => model.id === baseModelId) ?? models[0],
    currentReasoning: "default",
    models,
  };
};

const buildPickerConfig = (options: {
  readonly currentModelId: string;
  readonly currentReasoning?: string;
  readonly localModelOptions?: readonly StatusPanelLocalModelOption[];
  readonly providerId: ProviderStackId;
}): PickerConfig => {
  if (options.providerId === "claudeCodeCli") {
    return buildClaudeConfig(options.currentModelId, options.currentReasoning);
  }
  if (options.providerId === "kimiCode") {
    return buildKimiConfig(options.currentModelId);
  }
  if (options.providerId === "glmOpenCode") {
    return buildGlmOpenCodeConfig(options.currentModelId);
  }
  if (options.providerId === "glmNative") {
    return buildGlmNativeConfig();
  }
  if (options.providerId === "localModels") {
    return buildLocalModelsConfig(
      options.currentModelId,
      options.localModelOptions
    );
  }
  return buildCodexConfig(options.currentModelId, options.currentReasoning);
};

export const StatusPanelModelPicker = ({
  anchorLeft,
  currentModelId,
  currentReasoning,
  localModelOptions,
  mode,
  onClose,
  onSelectModel,
  onSelectReasoning,
  providerId,
}: StatusPanelModelPickerProps) => {
  const config = buildPickerConfig({
    currentModelId,
    currentReasoning,
    localModelOptions,
    providerId,
  });

  if (mode === "reasoning") {
    return (
      <div
        className="session-status-picker"
        data-provider={providerId}
        style={pickerStyle(anchorLeft)}
      >
        {config.currentModel.reasoningOptions.map((reasoning) => {
          const isActive = reasoning === config.currentReasoning;
          return (
            <button
              className="session-status-picker__option"
              data-active={isActive ? "true" : undefined}
              data-provider={providerId}
              data-reasoning={reasoning}
              key={reasoning}
              onClick={() => {
                onSelectReasoning?.(reasoning);
                onClose();
              }}
              type="button"
            >
              <span>{reasoning}</span>
            </button>
          );
        })}
        <button
          className="session-status-picker__option session-status-picker__option--close"
          onClick={onClose}
          type="button"
        >
          Close
        </button>
      </div>
    );
  }

  return (
    <div
      className="session-status-picker"
      data-provider={providerId}
      style={pickerStyle(anchorLeft)}
    >
      {config.models.map((model) => {
        const isActive = model.id === config.currentModel.id;
        return (
          <button
            className="session-status-picker__option"
            data-active={isActive ? "true" : undefined}
            data-model-id={model.id}
            data-provider={providerId}
            key={model.id}
            onClick={() => {
              onSelectModel?.(model.id);
              onClose();
            }}
            type="button"
          >
            <span>{model.displayName}</span>
          </button>
        );
      })}
      <button
        className="session-status-picker__option session-status-picker__option--close"
        onClick={onClose}
        type="button"
      >
        Close
      </button>
    </div>
  );
};
