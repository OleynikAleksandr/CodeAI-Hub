import type { CSSProperties, FC } from "react";
import { memo, useMemo, useState } from "react";
import {
  CODEX_RECOMMENDED_MODELS,
  type CodexModelId,
  type CodexReasoningLevel,
  DEFAULT_CODEX_MODEL_ID,
  DEFAULT_CODEX_REASONING_LEVEL,
} from "../../../../../../types/codex-model-registry";
import SettingsCard from "../settings-card";
import type { CodexReasoningByModel } from "../settings-state-model";
import CodexReasoningDialog from "./codex-reasoning-dialog";

type CodexDefaultModelCardProps = {
  readonly defaultModel: CodexModelId;
  readonly reasoningByModel: CodexReasoningByModel;
  readonly onDefaultModelChange: (modelId: CodexModelId) => void;
  readonly onReasoningChange: (
    modelId: CodexModelId,
    reasoning: CodexReasoningLevel
  ) => void;
};

const descriptionStyles: CSSProperties = {
  fontSize: "12px",
  color: "#b0b0b0",
  margin: 0,
  lineHeight: 1.5,
};

const warningStyles: CSSProperties = {
  background: "#3a2a1f",
  border: "1px solid #9b6b3d",
  color: "#ffd7a3",
  borderRadius: "4px",
  padding: "8px 10px",
  fontSize: "12px",
  lineHeight: 1.5,
};

const modelListStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const modelRowStyles: CSSProperties = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
  border: "1px solid #2f2f2f",
  borderRadius: "6px",
  padding: "12px",
  background: "#252526",
  outline: "none",
  boxShadow: "none",
};

const modelRowSelectedStyles: CSSProperties = {
  borderColor: "#0e639c",
  background: "#1f2a33",
};

const radioStyles: CSSProperties = {
  marginTop: "3px",
  width: "16px",
  height: "16px",
  cursor: "pointer",
  outline: "none",
  boxShadow: "none",
};

const modelLabelStyles: CSSProperties = {
  display: "flex",
  gap: "12px",
  cursor: "pointer",
  outline: "none",
  width: "100%",
};

const modelTitleStyles: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#e5e5e5",
};

const modelIdStyles: CSSProperties = {
  fontSize: "11px",
  color: "#8c8c8c",
};

const modelDescriptionStyles: CSSProperties = {
  fontSize: "12px",
  color: "#a8a8a8",
  margin: "4px 0 0",
  lineHeight: 1.4,
};

const modelBodyStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "8px",
  flex: 1,
};

const reasoningRowStyles: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  paddingLeft: "28px",
};

const reasoningLabelStyles: CSSProperties = {
  fontSize: "11px",
  color: "#8f8f8f",
};

const reasoningButtonStyles: CSSProperties = {
  border: "1px solid #3a3d41",
  background: "transparent",
  color: "#d7d7d7",
  padding: "4px 10px",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "11px",
  outline: "none",
};

const reasoningButtonHoverStyles: CSSProperties = {
  borderColor: "#5a5a5a",
  background: "#2b2f33",
  color: "#ffffff",
};

const reasoningButtonActiveStyles: CSSProperties = {
  borderColor: "#0e639c",
  background: "#0e639c",
  color: "#ffffff",
};

const noteStyles: CSSProperties = {
  fontSize: "11px",
  color: "#8f8f8f",
  margin: 0,
};

const focusResetStyles = `
  .codex-model-selector *:focus,
  .codex-model-selector *:focus-visible,
  .codex-model-selector *:focus-within {
    outline: none !important;
    box-shadow: none !important;
  }
`;

const CodexDefaultModelCard: FC<CodexDefaultModelCardProps> = ({
  defaultModel,
  reasoningByModel,
  onDefaultModelChange,
  onReasoningChange,
}) => {
  const [activeModelId, setActiveModelId] = useState<CodexModelId | null>(null);
  const [hoveredModelId, setHoveredModelId] = useState<CodexModelId | null>(
    null
  );
  const [pressedModelId, setPressedModelId] = useState<CodexModelId | null>(
    null
  );

  const recommendedModelIds = useMemo(
    () => new Set<string>(CODEX_RECOMMENDED_MODELS.map((model) => model.id)),
    []
  );

  const selectedModelId = recommendedModelIds.has(defaultModel)
    ? defaultModel
    : DEFAULT_CODEX_MODEL_ID;
  const hasUnsupportedModel = !recommendedModelIds.has(defaultModel);
  const activeModel = CODEX_RECOMMENDED_MODELS.find(
    (model) => model.id === activeModelId
  );

  const resolveReasoning = (modelId: CodexModelId): CodexReasoningLevel =>
    reasoningByModel[modelId] ?? DEFAULT_CODEX_REASONING_LEVEL;

  return (
    <>
      <style>{focusResetStyles}</style>
      <SettingsCard title="Codex Default model">
        <p style={descriptionStyles}>
          Select which Codex model to use when starting new sessions. Each model
          can store its own reasoning effort level.
        </p>
        {hasUnsupportedModel ? (
          <div style={warningStyles}>
            The saved default model is no longer available. Falling back to
            GPT-5.2-Codex.
          </div>
        ) : null}
        <div className="codex-model-selector" style={modelListStyles}>
          {CODEX_RECOMMENDED_MODELS.map((model) => {
            const isSelected = selectedModelId === model.id;
            const inputId = `codex-default-model-${model.id}`;
            const reasoningLevel = resolveReasoning(model.id);
            const isHovered = hoveredModelId === model.id;
            const isPressed = pressedModelId === model.id;
            let reasoningStateStyles: CSSProperties | null = null;
            if (isPressed) {
              reasoningStateStyles = reasoningButtonActiveStyles;
            } else if (isHovered) {
              reasoningStateStyles = reasoningButtonHoverStyles;
            }
            return (
              <div
                key={model.id}
                style={{
                  ...modelRowStyles,
                  ...(isSelected ? modelRowSelectedStyles : null),
                }}
              >
                <div style={modelBodyStyles}>
                  <label htmlFor={inputId} style={modelLabelStyles}>
                    <input
                      checked={isSelected}
                      id={inputId}
                      name="codex-default-model"
                      onChange={(event) => {
                        onDefaultModelChange(model.id);
                        event.currentTarget.blur();
                      }}
                      style={radioStyles}
                      type="radio"
                    />
                    <div style={{ flex: 1 }}>
                      <div style={modelTitleStyles}>{model.displayName}</div>
                      <div style={modelIdStyles}>{model.id}</div>
                      <p style={modelDescriptionStyles}>{model.description}</p>
                    </div>
                  </label>
                  <div style={reasoningRowStyles}>
                    <span style={reasoningLabelStyles}>
                      Configure reasoning:
                    </span>
                    <button
                      onClick={() => setActiveModelId(model.id)}
                      onMouseDown={() => setPressedModelId(model.id)}
                      onMouseEnter={() => setHoveredModelId(model.id)}
                      onMouseLeave={() => {
                        setHoveredModelId((current) =>
                          current === model.id ? null : current
                        );
                        setPressedModelId((current) =>
                          current === model.id ? null : current
                        );
                      }}
                      onMouseUp={() => {
                        setPressedModelId((current) =>
                          current === model.id ? null : current
                        );
                      }}
                      style={{
                        ...reasoningButtonStyles,
                        ...(reasoningStateStyles ?? {}),
                      }}
                      type="button"
                    >
                      {reasoningLevel}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p style={noteStyles}>
          Changes apply when creating a new Codex session.
        </p>
      </SettingsCard>
      {activeModel ? (
        <CodexReasoningDialog
          initialReasoning={resolveReasoning(activeModel.id)}
          model={activeModel}
          onCancel={() => setActiveModelId(null)}
          onSave={(reasoning) => {
            onReasoningChange(activeModel.id, reasoning);
            setActiveModelId(null);
          }}
        />
      ) : null}
    </>
  );
};

export default memo(CodexDefaultModelCard);
