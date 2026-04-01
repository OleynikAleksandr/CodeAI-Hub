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
  readonly onThinkingDisplaySyncChange: (enabled: boolean) => void;
  readonly thinkingDisplaySyncEnabled: boolean;
}

const wrapperStyles: CSSProperties = {
  marginBottom: "30px",
};

const displaySyncToggleStyles: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  cursor: "pointer",
  gap: "12px",
  marginBottom: "20px",
};

const displaySyncCheckboxStyles: CSSProperties = {
  marginTop: "2px",
  width: "16px",
  height: "16px",
  cursor: "pointer",
};

const displaySyncTitleStyles: CSSProperties = {
  fontSize: "13px",
  fontWeight: 500,
  marginBottom: "4px",
};

const displaySyncDescriptionStyles: CSSProperties = {
  fontSize: "12px",
  color: "#999999",
  lineHeight: "1.4",
};

const ThinkingSettings: FC<ThinkingSettingsProps> = ({
  enabled,
  maxTokens,
  thinkingDisplaySyncEnabled,
  onThinkingDisplaySyncChange,
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
        <label style={displaySyncToggleStyles}>
          <input
            checked={thinkingDisplaySyncEnabled}
            onChange={(event) =>
              onThinkingDisplaySyncChange(event.target.checked)
            }
            style={displaySyncCheckboxStyles}
            type="checkbox"
          />
          <div style={{ flex: 1 }}>
            <div style={displaySyncTitleStyles}>Thinking in dialog</div>
            <div style={displaySyncDescriptionStyles}>
              Show Claude reasoning as a normal assistant bubble with a Thinking
              label.
            </div>
          </div>
        </label>
        <ThinkingTokenInput onChange={handleTokenChange} value={maxTokens} />
        <ThinkingProTip />
      </SettingsCard>
    </div>
  );
};

export default memo(ThinkingSettings);
