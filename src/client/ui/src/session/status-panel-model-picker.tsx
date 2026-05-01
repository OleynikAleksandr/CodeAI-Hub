import type { CSSProperties } from "react";
import {
  CLAUDE_MODEL_ALIASES,
  DEFAULT_CLAUDE_MODEL_ALIAS,
} from "../../../../types/claude-model-registry";
import {
  CODEX_SETTINGS_MODELS,
  type CodexReasoningLevel,
} from "../../../../types/codex-model-registry";
import type { ProviderStackId } from "../../../../types/provider";

export type StatusPanelPickerMode = "model" | "reasoning";

interface StatusPanelModelPickerProps {
  readonly anchorLeft: number;
  readonly currentModelId: string;
  readonly currentReasoning?: string;
  readonly mode: StatusPanelPickerMode;
  readonly onClose: () => void;
  readonly onSelectModel?: (modelId: string, reasoning: string) => void;
  readonly onSelectReasoning?: (reasoning: string) => void;
  readonly providerId: ProviderStackId;
}

const EFFECTIVE_MODEL_SUFFIX_PATTERN = /\s+(reasoning|thinking):[^\s]+$/;
const REASONING_PREFIX_PATTERN = /^(reasoning|thinking)\s+/;

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
  position: "absolute",
  bottom: "calc(100% + 6px)",
  left: `${Math.max(0, anchorLeft)}px`,
  zIndex: 25,
  display: "grid",
  width: "min(360px, calc(100% - 16px))",
  maxHeight: "260px",
  overflowY: "auto",
  padding: "8px",
  background: "rgba(30, 31, 32, 0.98)",
  border: "1px solid rgba(1, 240, 216, 0.35)",
  borderRadius: "6px",
  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
  gap: "6px",
});

const optionStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  minHeight: "30px",
  padding: "6px 8px",
  color: "#d7f8f4",
  textAlign: "left",
  background: "transparent",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: "6px",
  cursor: "pointer",
};

const closeStyle: CSSProperties = {
  ...optionStyle,
  justifyContent: "center",
  color: "#b0b0b0",
};

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

const buildPickerConfig = (options: {
  readonly currentModelId: string;
  readonly currentReasoning?: string;
  readonly providerId: ProviderStackId;
}): PickerConfig =>
  options.providerId === "claudeCodeCli"
    ? buildClaudeConfig(options.currentModelId, options.currentReasoning)
    : buildCodexConfig(options.currentModelId, options.currentReasoning);

export const StatusPanelModelPicker = ({
  anchorLeft,
  currentModelId,
  currentReasoning,
  mode,
  onClose,
  onSelectModel,
  onSelectReasoning,
  providerId,
}: StatusPanelModelPickerProps) => {
  const config = buildPickerConfig({
    currentModelId,
    currentReasoning,
    providerId,
  });

  if (mode === "reasoning") {
    return (
      <div className="session-status-picker" style={pickerStyle(anchorLeft)}>
        {config.currentModel.reasoningOptions.map((reasoning) => (
          <button
            data-reasoning={reasoning}
            key={reasoning}
            onClick={() => {
              onSelectReasoning?.(reasoning);
              onClose();
            }}
            style={optionStyle}
            type="button"
          >
            <span>{reasoning}</span>
            {reasoning === config.currentReasoning ? <span>active</span> : null}
          </button>
        ))}
        <button onClick={onClose} style={closeStyle} type="button">
          Close
        </button>
      </div>
    );
  }

  return (
    <div className="session-status-picker" style={pickerStyle(anchorLeft)}>
      {config.models.map((model) => {
        const nextReasoning = model.reasoningOptions.includes(
          config.currentReasoning
        )
          ? config.currentReasoning
          : model.defaultReasoning;
        return (
          <button
            data-model-id={model.id}
            key={model.id}
            onClick={() => {
              onSelectModel?.(model.id, nextReasoning);
              onClose();
            }}
            style={optionStyle}
            type="button"
          >
            <span>{model.displayName}</span>
            <span>{nextReasoning}</span>
          </button>
        );
      })}
      <button onClick={onClose} style={closeStyle} type="button">
        Close
      </button>
    </div>
  );
};
