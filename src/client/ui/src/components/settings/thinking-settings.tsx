import type { CSSProperties, FC } from "react";
import { memo } from "react";
import type { ClaudeThinkingEffort } from "../../../../../types/claude-model-registry";
import { useLocalization } from "../../app-host/use-localization";
import SettingsCard from "./settings-card";
import ThinkingEffortSelector from "./thinking/thinking-effort-selector";
import ThinkingProTip from "./thinking/thinking-pro-tip";
import ThinkingToggle from "./thinking/thinking-toggle";

interface ThinkingSettingsProps {
  readonly effort: ClaudeThinkingEffort;
  readonly enabled: boolean;
  readonly onChange: (enabled: boolean, effort: ClaudeThinkingEffort) => void;
  readonly onThinkingDisplaySyncChange: (enabled: boolean) => void;
  readonly thinkingDisplaySyncEnabled: boolean;
}

const UI_HELPER_TEXT_CATEGORY = "user_guidance";

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
  effort,
  enabled,
  thinkingDisplaySyncEnabled,
  onThinkingDisplaySyncChange,
  onChange,
}) => {
  const { t } = useLocalization();
  const handleToggle = (nextEnabled: boolean) => {
    onChange(nextEnabled, effort);
  };

  const handleEffortChange = (nextEffort: ClaudeThinkingEffort) => {
    onChange(enabled, nextEffort);
  };
  const thinkingInDialogDescription = t(
    UI_HELPER_TEXT_CATEGORY,
    "settings.claude_thinking_settings.thinking_in_dialog.description",
    "Show Claude reasoning as a normal assistant bubble with a Thinking label."
  );

  return (
    <div style={wrapperStyles}>
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
              {thinkingInDialogDescription}
            </div>
          </div>
        </label>
        <ThinkingEffortSelector
          enabled={enabled}
          onChange={handleEffortChange}
          value={effort}
        />
        <ThinkingProTip />
      </SettingsCard>
    </div>
  );
};

export default memo(ThinkingSettings);
