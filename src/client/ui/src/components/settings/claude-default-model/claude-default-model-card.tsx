import type { CSSProperties, FC, KeyboardEvent } from "react";
import { memo, useState } from "react";
import {
  CLAUDE_MODEL_ALIASES,
  type ClaudeModelAliasId,
} from "../../../../../../types/claude-model-registry";
import { useLocalization } from "../../../app-host/use-localization";
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

interface ClaudeDefaultModelCardProps {
  readonly defaultModel: ClaudeModelAliasId;
  readonly onDefaultModelChange: (model: ClaudeModelAliasId) => void;
}

const UI_HELPER_TEXT_CATEGORY = "user_guidance";

const ClaudeDefaultModelCard: FC<ClaudeDefaultModelCardProps> = ({
  defaultModel,
  onDefaultModelChange,
}) => {
  const { t } = useLocalization();
  const [hoveredAlias, setHoveredAlias] = useState<ClaudeModelAliasId | null>(
    null
  );
  const description = t(
    UI_HELPER_TEXT_CATEGORY,
    "settings.claude_default_model.description",
    "Choose the Claude alias that will be applied when new sessions start. More details in the knowledge base: doc/SolidWorks-Flow/knowledge/model-reference/Claude_Model_Aliases.md"
  );
  const note = t(
    UI_HELPER_TEXT_CATEGORY,
    "settings.claude_default_model.note",
    "Applies only to newly created Claude sessions."
  );
  const resolveModelDescription = (
    model: (typeof CLAUDE_MODEL_ALIASES)[number]
  ) =>
    t(
      UI_HELPER_TEXT_CATEGORY,
      `settings.claude_default_model.option.${model.alias}.description`,
      model.description
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
      <p style={descriptionStyles}>{description}</p>
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
                <p style={modelDescriptionStyles}>
                  {resolveModelDescription(model)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
      <p style={noteStyles}>{note}</p>
    </SettingsCard>
  );
};

export default memo(ClaudeDefaultModelCard);
