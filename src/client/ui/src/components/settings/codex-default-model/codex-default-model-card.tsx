import type { CSSProperties, FC, KeyboardEvent } from "react";
import { memo, useMemo, useState } from "react";
import {
  CODEX_SETTINGS_MODELS,
  type CodexModelId,
  type CodexReasoningLevel,
  DEFAULT_CODEX_MODEL_ID,
  DEFAULT_CODEX_REASONING_LEVEL,
} from "../../../../../../types/codex-model-registry";
import { useLocalization } from "../../../app-host/use-localization";
import SettingsCard from "../settings-card";
import type { CodexReasoningByModel } from "../settings-state-model";
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
  warningStyles,
} from "./codex-model-card-styles";
import CodexReasoningDialog from "./codex-reasoning-dialog";

interface CodexDefaultModelCardProps {
  readonly defaultModel: CodexModelId;
  readonly onDefaultModelChange: (modelId: CodexModelId) => void;
  readonly onReasoningChange: (
    modelId: CodexModelId,
    reasoning: CodexReasoningLevel
  ) => void;
  readonly onReasoningSummaryEnabledChange: (enabled: boolean) => void;
  readonly reasoningByModel: CodexReasoningByModel;
  readonly reasoningSummaryEnabled: boolean;
}

const UI_HELPER_TEXT_CATEGORY = "user_guidance";

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

const CodexDefaultModelCard: FC<CodexDefaultModelCardProps> = ({
  defaultModel,
  reasoningByModel,
  reasoningSummaryEnabled,
  onDefaultModelChange,
  onReasoningChange,
  onReasoningSummaryEnabledChange,
}) => {
  const { t } = useLocalization();
  const [activeModelId, setActiveModelId] = useState<CodexModelId | null>(null);
  const [hoveredRowId, setHoveredRowId] = useState<CodexModelId | null>(null);
  const [hoveredButtonId, setHoveredButtonId] = useState<CodexModelId | null>(
    null
  );
  const [pressedButtonId, setPressedButtonId] = useState<CodexModelId | null>(
    null
  );

  const recommendedModelIds = useMemo(
    () => new Set<string>(CODEX_SETTINGS_MODELS.map((model) => model.id)),
    []
  );

  const fallbackModelDisplayName =
    CODEX_SETTINGS_MODELS.find((model) => model.id === DEFAULT_CODEX_MODEL_ID)
      ?.displayName ?? DEFAULT_CODEX_MODEL_ID;
  const selectedModelId = recommendedModelIds.has(defaultModel)
    ? defaultModel
    : DEFAULT_CODEX_MODEL_ID;
  const hasUnsupportedModel = !recommendedModelIds.has(defaultModel);
  const activeModel = CODEX_SETTINGS_MODELS.find(
    (model) => model.id === activeModelId
  );
  const description = t(
    UI_HELPER_TEXT_CATEGORY,
    "settings.codex_default_model.description",
    "Select which Codex model to use when starting new sessions. Each model can store its own reasoning effort level."
  );
  const reasoningInDialogDescription = t(
    UI_HELPER_TEXT_CATEGORY,
    "settings.codex_default_model.reasoning_in_dialog.description",
    "When enabled, Codex can send reasoning summaries. CodeAI Hub translates them and shows them in the dialog."
  );
  const note = t(
    UI_HELPER_TEXT_CATEGORY,
    "settings.codex_default_model.note",
    "Changes apply when creating a new Codex session."
  );

  const resolveReasoning = (modelId: CodexModelId): CodexReasoningLevel =>
    reasoningByModel[modelId] ?? DEFAULT_CODEX_REASONING_LEVEL;

  const handleRowClick = (modelId: CodexModelId) => {
    onDefaultModelChange(modelId);
  };

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    modelId: CodexModelId
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onDefaultModelChange(modelId);
    }
  };

  const handleReasoningButtonClick = (
    event: React.MouseEvent,
    modelId: CodexModelId
  ) => {
    event.stopPropagation();
    setActiveModelId(modelId);
  };

  return (
    <>
      <SettingsCard title="Codex Default model">
        <p style={descriptionStyles}>{description}</p>
        <label style={displaySyncToggleStyles}>
          <input
            checked={reasoningSummaryEnabled}
            onChange={(event) =>
              onReasoningSummaryEnabledChange(event.target.checked)
            }
            style={displaySyncCheckboxStyles}
            type="checkbox"
          />
          <div>
            <div style={displaySyncTitleStyles}>Reasoning in dialog</div>
            <div style={displaySyncDescriptionStyles}>
              {reasoningInDialogDescription}
            </div>
          </div>
        </label>
        {hasUnsupportedModel ? (
          <div style={warningStyles}>
            The saved default model is no longer available. Falling back to
            {` ${fallbackModelDisplayName}.`}
          </div>
        ) : null}
        <div style={listStyles}>
          {CODEX_SETTINGS_MODELS.map((model) => {
            const isSelected = selectedModelId === model.id;
            const isRowHovered = hoveredRowId === model.id;
            const reasoningLevel = resolveReasoning(model.id);
            const isButtonHovered = hoveredButtonId === model.id;
            const isButtonPressed = pressedButtonId === model.id;

            let reasoningStateStyles: CSSProperties = {};
            if (isButtonPressed) {
              reasoningStateStyles = reasoningButtonActiveStyles;
            } else if (isButtonHovered) {
              reasoningStateStyles = reasoningButtonHoverStyles;
            }

            const rowStyle: CSSProperties = {
              ...rowBaseStyles,
              ...rowButtonResetStyles,
              ...(isSelected ? rowSelectedStyles : {}),
              ...(!isSelected && isRowHovered ? rowHoverStyles : {}),
            };

            return (
              // biome-ignore lint/a11y/useSemanticElements: Custom radio to avoid browser focus styles on native input
              <div
                aria-checked={isSelected}
                key={model.id}
                onClick={() => handleRowClick(model.id)}
                onKeyDown={(e) => handleRowKeyDown(e, model.id)}
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
                      Configure reasoning:
                    </span>
                    <button
                      onClick={(e) => handleReasoningButtonClick(e, model.id)}
                      onMouseDown={() => setPressedButtonId(model.id)}
                      onMouseEnter={() => setHoveredButtonId(model.id)}
                      onMouseLeave={() => {
                        setHoveredButtonId(null);
                        setPressedButtonId(null);
                      }}
                      onMouseUp={() => setPressedButtonId(null)}
                      style={{
                        ...reasoningButtonStyles,
                        ...reasoningStateStyles,
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
        <p style={noteStyles}>{note}</p>
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
