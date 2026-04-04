import type { CSSProperties, FC, KeyboardEvent } from "react";
import { useState } from "react";
import {
  CLAUDE_THINKING_EFFORTS,
  type ClaudeThinkingEffort,
} from "../../../../../../types/claude-model-registry";
import { useLocalization } from "../../../app-host/use-localization";
import {
  listStyles,
  modelDescriptionStyles,
  modelInfoStyles,
  modelTitleStyles,
  radioCircleInnerStyles,
  radioCircleSelectedStyles,
  radioCircleStyles,
  rowBaseStyles,
  rowButtonResetStyles,
  rowHoverStyles,
  rowSelectedStyles,
} from "../shared-model-card-styles";

interface ThinkingEffortSelectorProps {
  readonly enabled: boolean;
  readonly onChange: (nextValue: ClaudeThinkingEffort) => void;
  readonly value: ClaudeThinkingEffort;
}

const UI_HELPER_TEXT_CATEGORY = "user_guidance";

const containerStyles: CSSProperties = {
  paddingLeft: "28px",
  borderTop: "1px solid #3c3c3c",
  paddingTop: "15px",
};

const titleStyles: CSSProperties = {
  fontSize: "13px",
  fontWeight: 500,
  marginBottom: "8px",
};

const subtitleStyles: CSSProperties = {
  fontSize: "12px",
  color: "#999999",
  marginBottom: "12px",
  lineHeight: "1.4",
};

const disabledContainerStyles: CSSProperties = {
  opacity: 0.6,
  pointerEvents: "none",
};

const ThinkingEffortSelector: FC<ThinkingEffortSelectorProps> = ({
  enabled,
  onChange,
  value,
}) => {
  const { t } = useLocalization();
  const [hoveredEffort, setHoveredEffort] =
    useState<ClaudeThinkingEffort | null>(null);
  const subtitle = t(
    UI_HELPER_TEXT_CATEGORY,
    "settings.claude_thinking_settings.effort.subtitle",
    "Choose how much reasoning effort Claude should apply for new sessions."
  );

  const resolveDescription = (effort: ClaudeThinkingEffort) =>
    t(
      UI_HELPER_TEXT_CATEGORY,
      `settings.claude_thinking_settings.effort.${effort}_description`,
      CLAUDE_THINKING_EFFORTS.find((entry) => entry.name === effort)
        ?.description ?? ""
    );

  const resolveUseCase = (effort: ClaudeThinkingEffort) =>
    CLAUDE_THINKING_EFFORTS.find((entry) => entry.name === effort)?.useCase ??
    "";

  const handleKeyDown = (
    event: KeyboardEvent<HTMLDivElement>,
    effort: ClaudeThinkingEffort
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onChange(effort);
    }
  };

  return (
    <div
      style={{
        ...containerStyles,
        ...(enabled ? null : disabledContainerStyles),
      }}
    >
      <div style={titleStyles}>Reasoning effort</div>
      <div style={subtitleStyles}>{subtitle}</div>
      <div style={listStyles}>
        {CLAUDE_THINKING_EFFORTS.map((effort) => {
          const isSelected = value === effort.name;
          const rowStyle: CSSProperties = {
            ...rowBaseStyles,
            ...rowButtonResetStyles,
            ...(isSelected ? rowSelectedStyles : {}),
            ...(!isSelected && hoveredEffort === effort.name
              ? rowHoverStyles
              : {}),
          };

          return (
            // biome-ignore lint/a11y/useSemanticElements: custom radio rows match the rest of the provider settings UI
            <div
              aria-checked={isSelected}
              key={effort.name}
              onClick={() => onChange(effort.name)}
              onKeyDown={(event) => handleKeyDown(event, effort.name)}
              onMouseEnter={() => setHoveredEffort(effort.name)}
              onMouseLeave={() => setHoveredEffort(null)}
              role="radio"
              style={rowStyle}
              tabIndex={enabled ? 0 : -1}
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
                <div style={modelTitleStyles}>{effort.name}</div>
                <div style={modelDescriptionStyles}>
                  {resolveDescription(effort.name)}
                </div>
                <div style={modelDescriptionStyles}>
                  {resolveUseCase(effort.name)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ThinkingEffortSelector;
