import type { CSSProperties, FC } from "react";
import { memo } from "react";
import { hideSpinnerStyle } from "./thinking/constants";
import ThinkingProTip from "./thinking/thinking-pro-tip";
import ThinkingToggle from "./thinking/thinking-toggle";
import ThinkingTokenInput from "./thinking/thinking-token-input";

type ThinkingSettingsProps = {
  readonly enabled: boolean;
  readonly maxTokens: number;
  readonly onChange: (enabled: boolean, maxTokens: number) => void;
};

const wrapperStyles: CSSProperties = {
  marginBottom: "30px",
};

const titleStyles: CSSProperties = {
  fontSize: "14px",
  fontWeight: 600,
  marginBottom: "15px",
  color: "#e0e0e0",
};

const cardStyles: CSSProperties = {
  background: "#252526",
  borderRadius: "6px",
  padding: "15px",
  border: "1px solid #3c3c3c",
};

const ThinkingSettings: FC<ThinkingSettingsProps> = ({
  enabled,
  maxTokens,
  onChange,
}) => {
  const handleToggle = (nextEnabled: boolean) => {
    onChange(nextEnabled, maxTokens);
  };

  const handleTokenChange = (nextValue: number) => {
    onChange(enabled, nextValue);
  };

  return (
    <div style={wrapperStyles}>
      <style>{hideSpinnerStyle}</style>
      <h3 style={titleStyles}>Thinking Settings</h3>
      <div style={cardStyles}>
        <ThinkingToggle enabled={enabled} onToggle={handleToggle} />
        <ThinkingTokenInput onChange={handleTokenChange} value={maxTokens} />
        <ThinkingProTip />
      </div>
    </div>
  );
};

export default memo(ThinkingSettings);
