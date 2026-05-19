import type { CSSProperties, FC } from "react";
import type { GlmClaudeCodeSettings } from "./kimi-settings-state";
import SettingsCard from "./settings-card";
import { descriptionStyles, noteStyles } from "./shared-model-card-styles";

interface GlmClaudeCodeSettingsCardProps {
  readonly onThinkingDisplaySyncChange?: (enabled: boolean) => void;
  readonly settings?: GlmClaudeCodeSettings;
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

const configRowStyles: CSSProperties = {
  display: "grid",
  gap: "4px",
  margin: "8px 0",
};

const configLabelStyles: CSSProperties = {
  color: "#999999",
  fontSize: "12px",
};

const configValueStyles: CSSProperties = {
  fontFamily: "var(--vscode-editor-font-family, monospace)",
  fontSize: "12px",
  wordBreak: "break-all",
};

const GlmClaudeCodeSettingsCard: FC<GlmClaudeCodeSettingsCardProps> = ({
  onThinkingDisplaySyncChange,
  settings,
  thinkingDisplaySyncEnabled = true,
}) => (
  <SettingsCard title="GLM-Claude-Code">
    <p style={descriptionStyles}>
      Runs GLM 5.1 through the Claude Agent SDK-compatible runtime as model
      glm-5.1.
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
          Show GLM-Claude-Code reasoning as a normal assistant bubble in the
          dialog.
        </div>
      </div>
    </label>
    <div style={configRowStyles}>
      <span style={configLabelStyles}>Config</span>
      <span style={configValueStyles}>{settings?.configPath}</span>
    </div>
    <div style={configRowStyles}>
      <span style={configLabelStyles}>Base URL</span>
      <span style={configValueStyles}>{settings?.baseUrl}</span>
    </div>
    <div style={configRowStyles}>
      <span style={configLabelStyles}>Models</span>
      <span style={configValueStyles}>
        {settings?.opusModel} / {settings?.sonnetModel} / {settings?.haikuModel}
      </span>
    </div>
    <p style={noteStyles}>
      Uses isolated home at ~/.codeai-hub/providers/glm-claude-code/home.
    </p>
  </SettingsCard>
);

export default GlmClaudeCodeSettingsCard;
