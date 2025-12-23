import type { CSSProperties, FC } from "react";
import { memo, useState } from "react";
import {
  CLAUDE_MODEL_ALIASES,
  type ClaudeModelAliasId,
} from "../../../../../../types/claude-model-registry";
import SettingsCard from "../settings-card";

const descriptionStyles: CSSProperties = {
  margin: 0,
  color: "#b0b0b0",
  fontSize: "12px",
  lineHeight: 1.5,
};

const noteStyles: CSSProperties = {
  margin: 0,
  fontSize: "11px",
  color: "#8f8f8f",
};

const listStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

const rowBaseStyles: CSSProperties = {
  display: "flex",
  gap: "12px",
  alignItems: "center",
  borderWidth: "1px",
  borderStyle: "solid",
  borderColor: "#2f2f2f",
  borderRadius: "6px",
  padding: "12px",
  background: "#252526",
  cursor: "pointer",
  transition: "border-color 0.15s, background 0.15s",
};

const rowSelectedStyles: CSSProperties = {
  borderColor: "#0e639c",
  background: "#1f2a33",
};

const rowHoverStyles: CSSProperties = {
  borderColor: "#4a4a4a",
};

const rowButtonResetStyles: CSSProperties = {
  appearance: "none",
  outline: "none",
  textAlign: "left",
};

const modelInfoStyles: CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const modelTitleStyles: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  color: "#e5e5e5",
};

const aliasStyles: CSSProperties = {
  fontSize: "11px",
  color: "#9b9b9b",
};

const modelDescriptionStyles: CSSProperties = {
  margin: 0,
  fontSize: "12px",
  color: "#a7a7a7",
  lineHeight: 1.4,
};

const radioCircleStyles: CSSProperties = {
  width: "16px",
  height: "16px",
  minWidth: "16px",
  borderRadius: "50%",
  border: "2px solid #5a5a5a",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  marginTop: "3px",
  transition: "border-color 0.15s",
};

const radioCircleSelectedStyles: CSSProperties = {
  borderColor: "#0e639c",
};

const radioCircleInnerStyles: CSSProperties = {
  width: "8px",
  height: "8px",
  borderRadius: "50%",
  background: "#0e639c",
};

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

  return (
    <SettingsCard title="Claude Default model">
      <p style={descriptionStyles}>
        Choose the Claude alias that will be applied when new sessions start.
        More details in the knowledge base:
        doc/Knowledge/Claude_Model_Aliases.md
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
            // biome-ignore lint/a11y/useSemanticElements: custom radio buttons to avoid native focus styles
            <button
              aria-checked={isSelected}
              key={model.alias}
              onClick={() => onDefaultModelChange(model.alias)}
              onMouseEnter={() => setHoveredAlias(model.alias)}
              onMouseLeave={() => setHoveredAlias(null)}
              role="radio"
              style={rowStyle}
              type="button"
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
            </button>
          );
        })}
      </div>
      <p style={noteStyles}>Applies only to newly created Claude sessions.</p>
    </SettingsCard>
  );
};

export default memo(ClaudeDefaultModelCard);
