import type { CSSProperties, FC } from "react";
import SettingsCard from "./settings-card";
import { descriptionStyles, noteStyles } from "./shared-model-card-styles";

interface KimiClaudeCodeSettingsCardProps {
  readonly onThinkingDisplaySyncChange?: (enabled: boolean) => void;
  readonly thinkingDisplaySyncEnabled?: boolean;
}

const displaySyncToggleStyles: CSSProperties = {
  display: "flex",
  gap: "12px",
  alignItems: "flex-start",
  margin: "4px 0 8px",
};

const displaySyncCheckboxStyles: CSSProperties = {
  marginTop: "2px",
  width: "16px",
  height: "16px",
  cursor: "pointer",
};

const displaySyncTitleStyles: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  marginBottom: "4px",
};

const displaySyncDescriptionStyles: CSSProperties = {
  fontSize: "12px",
  color: "#999999",
  lineHeight: 1.4,
};

const KimiClaudeCodeSettingsCard: FC<KimiClaudeCodeSettingsCardProps> = ({
  onThinkingDisplaySyncChange,
  thinkingDisplaySyncEnabled = true,
}) => (
  <SettingsCard title="Claude-Kimi">
    <p style={descriptionStyles}>
      Runs Kimi 2.6 through the Claude Agent SDK-compatible runtime as model
      kimi-for-coding.
    </p>
    <label style={displaySyncToggleStyles}>
      <input
        checked={thinkingDisplaySyncEnabled}
        onChange={(event) =>
          onThinkingDisplaySyncChange?.(event.target.checked)
        }
        style={displaySyncCheckboxStyles}
        type="checkbox"
      />
      <div>
        <div style={displaySyncTitleStyles}>Reasoning in dialog</div>
        <div style={displaySyncDescriptionStyles}>
          Show Claude-Kimi reasoning as a normal assistant bubble in the dialog.
        </div>
      </div>
    </label>
    <p style={noteStyles}>
      Uses isolated home at ~/.codeai-hub/providers/kimi-claude-code/home.
    </p>
  </SettingsCard>
);

export default KimiClaudeCodeSettingsCard;
