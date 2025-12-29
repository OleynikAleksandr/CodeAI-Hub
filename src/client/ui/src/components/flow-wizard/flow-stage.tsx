import type { CSSProperties } from "react";

import type { FlowStageId } from "./index";
import {
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
  const buttonStyles: CSSProperties = {
    ...flowStageButtonBaseStyles,
    ...(active ? flowStageButtonActiveStyles : {}),
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
      onClick={handleClick}
      style={buttonStyles}
      type="button"
    >
      <span style={flowStageTitleStyles}>{title}</span>
      <p style={flowStageSubtitleStyles}>{subtitle}</p>
    </button>
  );
};
