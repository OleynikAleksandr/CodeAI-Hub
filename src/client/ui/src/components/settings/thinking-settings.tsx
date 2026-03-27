import type { CSSProperties, FC } from "react";
import { memo } from "react";
import SettingsCard from "./settings-card";
import { hideSpinnerStyle } from "./thinking/constants";
import ThinkingProTip from "./thinking/thinking-pro-tip";
import ThinkingToggle from "./thinking/thinking-toggle";
import ThinkingTokenInput from "./thinking/thinking-token-input";

interface ThinkingSettingsProps {
  readonly enabled: boolean;
  readonly maxTokens: number;
  readonly onChange: (enabled: boolean, maxTokens: number) => void;
}

const wrapperStyles: CSSProperties = {
  marginBottom: "30px",
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
      <SettingsCard title="Claude Thinking Settings">
        <ThinkingToggle enabled={enabled} onToggle={handleToggle} />
        <ThinkingTokenInput onChange={handleTokenChange} value={maxTokens} />
        <ThinkingProTip />
      </SettingsCard>
    </div>
  );
};

export default memo(ThinkingSettings);
