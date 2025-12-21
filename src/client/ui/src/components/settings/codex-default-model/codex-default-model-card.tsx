import type { CSSProperties, FC } from "react";
import { memo, useMemo, useState } from "react";
import {
  CODEX_RECOMMENDED_MODELS,
  DEFAULT_CODEX_MODEL_ID,
  DEFAULT_CODEX_REASONING_LEVEL,
  type CodexModelId,
  type CodexReasoningLevel,
} from "../../../../../../types/codex-model-registry";
import type { CodexReasoningByModel } from "../settings-state-model";
import SettingsCard from "../settings-card";
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
};

const modelLabelStyles: CSSProperties = {
  display: "flex",
  flex: 1,
  gap: "12px",
  cursor: "pointer",
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

const modelMetaStyles: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  flexWrap: "wrap",
  marginTop: "8px",
};

const reasoningBadgeStyles: CSSProperties = {
  fontSize: "11px",
  background: "#2d2d2d",
  color: "#dcdcdc",
  padding: "2px 6px",
  borderRadius: "4px",
};

const configureButtonStyles: CSSProperties = {
  border: "1px solid #3a3d41",
  background: "transparent",
  color: "#6cb6ff",
  padding: "4px 10px",
  borderRadius: "4px",
  cursor: "pointer",
  fontSize: "11px",
};

const noteStyles: CSSProperties = {
  fontSize: "11px",
  color: "#8f8f8f",
  margin: 0,
};

const CodexDefaultModelCard: FC<CodexDefaultModelCardProps> = ({
  defaultModel,
  reasoningByModel,
  onDefaultModelChange,
  onReasoningChange,
}) => {
  const [activeModelId, setActiveModelId] =
    useState<CodexModelId | null>(null);

  const recommendedModelIds = useMemo(
    () => new Set(CODEX_RECOMMENDED_MODELS.map((model) => model.id)),
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
        <div style={modelListStyles}>
          {CODEX_RECOMMENDED_MODELS.map((model) => {
            const isSelected = selectedModelId === model.id;
            const inputId = `codex-default-model-${model.id}`;
            return (
              <div
                key={model.id}
                style={{
                  ...modelRowStyles,
                  ...(isSelected ? modelRowSelectedStyles : null),
                }}
              >
                <label htmlFor={inputId} style={modelLabelStyles}>
                  <input
                    checked={isSelected}
                    id={inputId}
                    name="codex-default-model"
                    onChange={() => onDefaultModelChange(model.id)}
                    style={radioStyles}
                    type="radio"
                  />
                  <div style={{ flex: 1 }}>
                    <div style={modelTitleStyles}>{model.displayName}</div>
                    <div style={modelIdStyles}>{model.id}</div>
                    <p style={modelDescriptionStyles}>{model.description}</p>
                    <div style={modelMetaStyles}>
                      <span style={reasoningBadgeStyles}>
                        Reasoning: {resolveReasoning(model.id)}
                      </span>
                    </div>
                  </div>
                </label>
                <div>
                  <button
                    onClick={() => setActiveModelId(model.id)}
                    style={configureButtonStyles}
                    type="button"
                  >
                    Configure reasoning
                  </button>
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
