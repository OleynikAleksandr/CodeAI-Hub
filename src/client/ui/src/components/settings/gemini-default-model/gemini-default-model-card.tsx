import type { CSSProperties, FC, KeyboardEvent } from "react";
import { memo, useState } from "react";
import {
  DEFAULT_GEMINI_THINKING_LEVEL,
  GEMINI_RECOMMENDED_MODELS,
  type GeminiModelId,
  type GeminiThinkingLevel,
} from "../../../../../../types/gemini-model-registry";
import type { GeminiThinkingByModel } from "../gemini-mapping";
import SettingsCard from "../settings-card";
import {
  descriptionStyles,
  listStyles,
  modelDescriptionStyles,
  modelInfoStyles,
  modelTitleStyles,
  noteStyles,
  radioCircleInnerStyles,
  radioCircleSelectedStyles,
  radioCircleStyles,
  rowBaseStyles,
  rowButtonResetStyles,
  rowHoverStyles,
  rowSelectedStyles,
} from "../shared-model-card-styles";
import {
  modelBodyStyles,
  modelIdStyles,
  reasoningButtonActiveStyles,
  reasoningButtonHoverStyles,
  reasoningButtonStyles,
  reasoningLabelStyles,
  reasoningRowStyles,
} from "./gemini-model-card-styles";
import GeminiThinkingDialog from "./gemini-thinking-dialog";

interface GeminiDefaultModelCardProps {
  readonly defaultModel: GeminiModelId;
  readonly onDefaultModelChange: (model: GeminiModelId) => void;
  readonly onThinkingChange: (
    modelId: GeminiModelId,
    level: GeminiThinkingLevel
  ) => void;
  readonly onThinkingDisplaySyncChange: (enabled: boolean) => void;
  readonly thinkingDisplaySyncEnabled: boolean;
  readonly thinkingLevelByModel: GeminiThinkingByModel;
}

const RadioCircle: FC<{ readonly checked: boolean }> = ({ checked }) => (
  <div
    style={{
      ...radioCircleStyles,
      ...(checked ? radioCircleSelectedStyles : {}),
    }}
  >
    {checked ? <div style={radioCircleInnerStyles} /> : null}
  </div>
);

const displaySyncToggleStyles: CSSProperties = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
  margin: "12px 0 18px",
};

const displaySyncCheckboxStyles: CSSProperties = {
  marginTop: "2px",
  width: "16px",
  height: "16px",
  cursor: "pointer",
};

const displaySyncTitleStyles: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  marginBottom: "4px",
};

const displaySyncDescriptionStyles: CSSProperties = {
  fontSize: "12px",
  color: "#999999",
  lineHeight: 1.4,
};

const GeminiDefaultModelCard: FC<GeminiDefaultModelCardProps> = ({
  defaultModel,
  thinkingLevelByModel,
  thinkingDisplaySyncEnabled,
  onDefaultModelChange,
  onThinkingChange,
  onThinkingDisplaySyncChange,
}) => {
  const [activeModelId, setActiveModelId] = useState<GeminiModelId | null>(
    null
  );
  const [hoveredRowId, setHoveredRowId] = useState<GeminiModelId | null>(null);
  const [hoveredButtonId, setHoveredButtonId] = useState<GeminiModelId | null>(
    null
  );
  const [pressedButtonId, setPressedButtonId] = useState<GeminiModelId | null>(
    null
  );

  const activeModel = GEMINI_RECOMMENDED_MODELS.find(
    (model) => model.id === activeModelId
  );

  const resolveThinkingLevel = (modelId: GeminiModelId): GeminiThinkingLevel =>
    thinkingLevelByModel[modelId] ?? DEFAULT_GEMINI_THINKING_LEVEL;

  const handleRowClick = (model: GeminiModelId) => {
    onDefaultModelChange(model);
  };

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    model: GeminiModelId
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onDefaultModelChange(model);
    }
  };

  const handleThinkingButtonClick = (
    event: React.MouseEvent,
    modelId: GeminiModelId
  ) => {
    event.stopPropagation();
    setActiveModelId(modelId);
  };

  return (
    <>
      <SettingsCard title="Gemini Default model">
        <p style={descriptionStyles}>
          Select the Gemini model to use for new sessions. Each model can store
          its own thinking level. More details in the knowledge base:
          doc/SolidWorks-Flow/knowledge/model-reference/Gemini_Model_Selection.md
        </p>
        <label style={displaySyncToggleStyles}>
          <input
            checked={thinkingDisplaySyncEnabled}
            onChange={(event) =>
              onThinkingDisplaySyncChange(event.target.checked)
            }
            style={displaySyncCheckboxStyles}
            type="checkbox"
          />
          <div>
            <div style={displaySyncTitleStyles}>Thinking in dialog</div>
            <div style={displaySyncDescriptionStyles}>
              Show translated Gemini reasoning as a normal assistant bubble in
              the dialog.
            </div>
          </div>
        </label>
        <div style={listStyles}>
          {GEMINI_RECOMMENDED_MODELS.map((model) => {
            const isSelected = defaultModel === model.id;
            const isRowHovered = hoveredRowId === model.id;
            const thinkingLevel = resolveThinkingLevel(model.id);
            const isButtonHovered = hoveredButtonId === model.id;
            const isButtonPressed = pressedButtonId === model.id;

            let thinkingStateStyles: CSSProperties = {};
            if (isButtonPressed) {
              thinkingStateStyles = reasoningButtonActiveStyles;
            } else if (isButtonHovered) {
              thinkingStateStyles = reasoningButtonHoverStyles;
            }

            const rowStyle: CSSProperties = {
              ...rowBaseStyles,
              ...rowButtonResetStyles,
              ...(isSelected ? rowSelectedStyles : {}),
              ...(!isSelected && isRowHovered ? rowHoverStyles : {}),
            };

            return (
              // biome-ignore lint/a11y/useSemanticElements: custom radio rows mimic Codex behavior to avoid browser focus rings
              <div
                aria-checked={isSelected}
                key={model.id}
                onClick={() => handleRowClick(model.id)}
                onKeyDown={(event) => handleRowKeyDown(event, model.id)}
                onMouseEnter={() => setHoveredRowId(model.id)}
                onMouseLeave={() => setHoveredRowId(null)}
                role="radio"
                style={rowStyle}
                tabIndex={-1}
              >
                <RadioCircle checked={isSelected} />
                <div style={modelBodyStyles}>
                  <div style={modelInfoStyles}>
                    <div style={modelTitleStyles}>{model.displayName}</div>
                    <div style={modelIdStyles}>{model.id}</div>
                    <p style={modelDescriptionStyles}>{model.description}</p>
                  </div>
                  <div style={reasoningRowStyles}>
                    <span style={reasoningLabelStyles}>
                      Configure thinking:
                    </span>
                    <button
                      onClick={(e) => handleThinkingButtonClick(e, model.id)}
                      onMouseDown={() => setPressedButtonId(model.id)}
                      onMouseEnter={() => setHoveredButtonId(model.id)}
                      onMouseLeave={() => {
                        setHoveredButtonId(null);
                        setPressedButtonId(null);
                      }}
                      onMouseUp={() => setPressedButtonId(null)}
                      style={{
                        ...reasoningButtonStyles,
                        ...thinkingStateStyles,
                      }}
                      type="button"
                    >
                      {thinkingLevel}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <p style={noteStyles}>Applies only to newly created Gemini sessions.</p>
      </SettingsCard>
      {activeModel ? (
        <GeminiThinkingDialog
          initialLevel={resolveThinkingLevel(activeModel.id)}
          model={activeModel}
          onCancel={() => setActiveModelId(null)}
          onSave={(level) => {
            onThinkingChange(activeModel.id, level);
            setActiveModelId(null);
          }}
        />
      ) : null}
    </>
  );
};

export default memo(GeminiDefaultModelCard);
