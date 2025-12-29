import { type CSSProperties, useState } from "react";

import type { FlowStageId } from "./index";
import {
  flowStageButtonActiveHoverStyles,
  flowStageButtonActiveStyles,
  flowStageButtonBaseStyles,
  flowStageButtonDisabledStyles,
  flowStageSubtitleStyles,
  flowStageTitleStyles,
} from "./styles";

export type FlowStageProps = {
  readonly id: FlowStageId;
  readonly title: string;
  readonly subtitle: string;
  readonly active: boolean;
  readonly disabled: boolean;
  readonly onStageClick: (stage: FlowStageId) => void;
};

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

  const interactive = active && !disabled;
  const showHoverStyles = interactive && (hovered || focused);
  const hoverStyles: CSSProperties = showHoverStyles
    ? flowStageButtonActiveHoverStyles
    : {};

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
