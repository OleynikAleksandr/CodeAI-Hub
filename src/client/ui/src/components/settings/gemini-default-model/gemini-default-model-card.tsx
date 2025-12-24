import type { CSSProperties, FC, KeyboardEvent } from "react";
import { memo, useState } from "react";
import {
  GEMINI_RECOMMENDED_MODELS,
  type GeminiModelId,
} from "../../../../../../types/gemini-model-registry";
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

type GeminiDefaultModelCardProps = {
  readonly defaultModel: GeminiModelId;
  readonly onDefaultModelChange: (model: GeminiModelId) => void;
};

const aliasStyles: CSSProperties = {
  fontSize: "11px",
  color: "#9b9b9b",
};

const GeminiDefaultModelCard: FC<GeminiDefaultModelCardProps> = ({
  defaultModel,
  onDefaultModelChange,
}) => {
  const [hoveredModel, setHoveredModel] = useState<GeminiModelId | null>(null);

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

  return (
    <SettingsCard title="Gemini Default model">
      <p style={descriptionStyles}>
        Select the Gemini model to use for new sessions.
        More details in the knowledge base: doc/Knowledge/Gemini_Model_Selection.md
      </p>
      <div style={listStyles}>
        {GEMINI_RECOMMENDED_MODELS.map((model) => {
          const isSelected = defaultModel === model.id;
          const rowStyle: CSSProperties = {
            ...rowBaseStyles,
            ...rowButtonResetStyles,
            ...(isSelected ? rowSelectedStyles : {}),
            ...(!isSelected && hoveredModel === model.id ? rowHoverStyles : {}),
          };
          return (
            // biome-ignore lint/a11y/useSemanticElements: custom radio rows mimic Codex behavior to avoid browser focus rings
            <div
              aria-checked={isSelected}
              key={model.id}
              onClick={() => handleRowClick(model.id)}
              onKeyDown={(event) => handleRowKeyDown(event, model.id)}
              onMouseEnter={() => setHoveredModel(model.id)}
              onMouseLeave={() => setHoveredModel(null)}
              role="radio"
              style={rowStyle}
              tabIndex={-1}
            >
              <div
                style={{
                  ...radioCircleStyles,
                  ...(isSelected ? radioCircleSelectedStyles : {}),
                }}
              >
                {isSelected ? <div style={radioCircleInnerStyles} /> : null}
              </div>
              <div style={modelInfoStyles}>
                <div style={modelTitleStyles}>{model.displayName}</div>
                <div style={aliasStyles}>{model.id}</div>
                <p style={modelDescriptionStyles}>{model.description}</p>
              </div>
            </div>
          );
        })}
      </div>
      <p style={noteStyles}>Applies only to newly created Gemini sessions.</p>
    </SettingsCard>
  );
};

export default memo(GeminiDefaultModelCard);
