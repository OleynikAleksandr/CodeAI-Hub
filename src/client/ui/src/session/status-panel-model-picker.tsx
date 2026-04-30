import type { CSSProperties } from "react";
import {
  CODEX_SETTINGS_MODELS,
  type CodexReasoningLevel,
} from "../../../../types/codex-model-registry";

export type StatusPanelPickerMode = "model" | "reasoning";

interface StatusPanelModelPickerProps {
  readonly anchorLeft: number;
  readonly currentModelId: string;
  readonly currentReasoning?: string;
  readonly mode: StatusPanelPickerMode;
  readonly onClose: () => void;
  readonly onSelectModel?: (
    modelId: string,
    reasoning: CodexReasoningLevel
  ) => void;
  readonly onSelectReasoning?: (reasoning: CodexReasoningLevel) => void;
}

const EFFECTIVE_MODEL_SUFFIX_PATTERN = /\s+(reasoning|thinking):[^\s]+$/;

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

const resolveCurrentReasoning = (
  currentReasoning: string | undefined
): CodexReasoningLevel | undefined =>
  currentReasoning === "low" ||
  currentReasoning === "medium" ||
  currentReasoning === "high" ||
  currentReasoning === "xhigh"
    ? currentReasoning
    : undefined;

export const StatusPanelModelPicker = ({
  anchorLeft,
  currentModelId,
  currentReasoning,
  mode,
  onClose,
  onSelectModel,
  onSelectReasoning,
}: StatusPanelModelPickerProps) => {
  const baseModelId = normalizeBaseModelId(currentModelId);
  const currentModel =
    CODEX_SETTINGS_MODELS.find((model) => model.id === baseModelId) ??
    CODEX_SETTINGS_MODELS[0];
  const normalizedReasoning = resolveCurrentReasoning(currentReasoning);
  const reasoningOptions = currentModel.reasoningEffortOptions;

  if (mode === "reasoning") {
    return (
      <div className="session-status-picker" style={pickerStyle(anchorLeft)}>
        {reasoningOptions.map((reasoning) => (
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
            {reasoning === normalizedReasoning ? <span>active</span> : null}
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
      {CODEX_SETTINGS_MODELS.map((model) => {
        const nextReasoning = model.reasoningEffortOptions.includes(
          normalizedReasoning ?? "medium"
        )
          ? (normalizedReasoning ?? "medium")
          : model.reasoningEffortOptions[0];
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
