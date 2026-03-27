import { type CSSProperties, useState } from "react";

import type { FlowStageId } from "./index";
import {
  flowStageButtonActiveHoverStyles,
  flowStageButtonActiveStyles,
  flowStageButtonBaseStyles,
  flowStageButtonDisabledStyles,
  flowStageButtonHoverStyles,
  flowStageSubtitleStyles,
  flowStageTitleStyles,
} from "./styles";

export interface FlowStageProps {
  readonly active: boolean;
  readonly disabled: boolean;
  readonly id: FlowStageId;
  readonly onStageClick: (stage: FlowStageId) => void;
  readonly subtitle: string;
  readonly title: string;
}

export const FlowStage = ({
  id,
  title,
  subtitle,
  active,
  disabled,
  onStageClick,
}: FlowStageProps) => {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);

  const interactive = !disabled;
  const showHoverStyles = interactive && (hovered || focused);
  let hoverStyles: CSSProperties = {};
  if (showHoverStyles) {
    hoverStyles = active
      ? flowStageButtonActiveHoverStyles
      : flowStageButtonHoverStyles;
  }

  const buttonStyles: CSSProperties = {
    ...flowStageButtonBaseStyles,
    ...(active ? flowStageButtonActiveStyles : {}),
    ...hoverStyles,
    ...(disabled ? flowStageButtonDisabledStyles : {}),
  };

  const handleClick = () => {
    if (disabled) {
      return;
    }
    onStageClick(id);
  };

  return (
    <button
      aria-current={active ? "step" : undefined}
      aria-disabled={disabled}
      disabled={disabled}
      onBlur={() => {
        setFocused(false);
      }}
      onClick={handleClick}
      onFocus={() => {
        setFocused(true);
      }}
      onMouseEnter={() => {
        setHovered(true);
      }}
      onMouseLeave={() => {
        setHovered(false);
      }}
      style={buttonStyles}
      type="button"
    >
      <span style={flowStageTitleStyles}>{title}</span>
      <p style={flowStageSubtitleStyles}>{subtitle}</p>
    </button>
  );
};
