import type { CSSProperties, FC, KeyboardEvent } from "react";
import { memo, useState } from "react";
import {
  CLAUDE_MODEL_ALIASES,
  type ClaudeModelAliasId,
} from "../../../../../../types/claude-model-registry";
import SettingsCard from "../settings-card";
import {
  aliasStyles,
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

type ClaudeDefaultModelCardProps = {
  readonly defaultModel: ClaudeModelAliasId;
  readonly onDefaultModelChange: (model: ClaudeModelAliasId) => void;
};

const ClaudeDefaultModelCard: FC<ClaudeDefaultModelCardProps> = ({
  defaultModel,
  onDefaultModelChange,
}) => {
  const [hoveredAlias, setHoveredAlias] = useState<ClaudeModelAliasId | null>(
    null
  );

  const handleRowClick = (model: ClaudeModelAliasId) => {
    onDefaultModelChange(model);
  };

  const handleRowKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    model: ClaudeModelAliasId
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onDefaultModelChange(model);
    }
  };

  return (
    <SettingsCard title="Claude Default model">
      <p style={descriptionStyles}>
        Choose the Claude alias that will be applied when new sessions start.
        More details in the knowledge base:
        doc/SolidWorks-Flow/knowledge/model-reference/Claude_Model_Aliases.md
      </p>
      <div style={listStyles}>
        {CLAUDE_MODEL_ALIASES.map((model) => {
          const isSelected = defaultModel === model.alias;
          const rowStyle: CSSProperties = {
            ...rowBaseStyles,
            ...rowButtonResetStyles,
            ...(isSelected ? rowSelectedStyles : {}),
            ...(!isSelected && hoveredAlias === model.alias
              ? rowHoverStyles
              : {}),
          };
          return (
            // biome-ignore lint/a11y/useSemanticElements: custom radio rows mimic Codex behavior to avoid browser focus rings
            <div
              aria-checked={isSelected}
              key={model.alias}
              onClick={() => handleRowClick(model.alias)}
              onKeyDown={(event) => handleRowKeyDown(event, model.alias)}
              onMouseEnter={() => setHoveredAlias(model.alias)}
              onMouseLeave={() => setHoveredAlias(null)}
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
                <div style={aliasStyles}>{model.alias}</div>
                <p style={modelDescriptionStyles}>{model.description}</p>
              </div>
            </div>
          );
        })}
      </div>
      <p style={noteStyles}>Applies only to newly created Claude sessions.</p>
    </SettingsCard>
  );
};

export default memo(ClaudeDefaultModelCard);
