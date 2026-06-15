import type { CSSProperties, FC } from "react";
import type { GlmClaudeCodeSettings } from "./kimi-settings-state";
import SettingsCard from "./settings-card";
import { descriptionStyles, noteStyles } from "./shared-model-card-styles";

interface GlmClaudeCodeSettingsCardProps {
  readonly onSettingsChange?: (settings: GlmClaudeCodeSettings) => void;
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

const inputStyles: CSSProperties = {
  background: "var(--vscode-input-background)",
  border: "1px solid var(--vscode-input-border, #3c3c3c)",
  borderRadius: "4px",
  color: "var(--vscode-input-foreground)",
  fontFamily: "var(--vscode-editor-font-family, monospace)",
  fontSize: "12px",
  minHeight: "28px",
  padding: "4px 8px",
};

const modelGridStyles: CSSProperties = {
  display: "grid",
  gap: "8px",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
};

const GlmClaudeCodeSettingsCard: FC<GlmClaudeCodeSettingsCardProps> = ({
  onSettingsChange,
  onThinkingDisplaySyncChange,
  settings,
  thinkingDisplaySyncEnabled = true,
}) => {
  const updateSetting = (key: keyof GlmClaudeCodeSettings, value: string) => {
    if (!settings) {
      return;
    }
    onSettingsChange?.({ ...settings, [key]: value });
  };

  return (
    <SettingsCard title="GLM-Claude-Code">
      <p style={descriptionStyles}>
        Runs GLM 5.2 through the Claude Agent SDK-compatible runtime as model
        glm-5.2.
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
      <label style={configRowStyles}>
        <span style={configLabelStyles}>API key</span>
        <input
          autoComplete="off"
          onChange={(event) => updateSetting("apiKey", event.target.value)}
          placeholder="Z.AI / GLM API key"
          style={inputStyles}
          type="password"
          value={settings?.apiKey ?? ""}
        />
      </label>
      <label style={configRowStyles}>
        <span style={configLabelStyles}>Config</span>
        <input
          onChange={(event) => updateSetting("configPath", event.target.value)}
          style={inputStyles}
          type="text"
          value={settings?.configPath ?? ""}
        />
      </label>
      <label style={configRowStyles}>
        <span style={configLabelStyles}>Base URL</span>
        <input
          onChange={(event) => updateSetting("baseUrl", event.target.value)}
          style={inputStyles}
          type="url"
          value={settings?.baseUrl ?? ""}
        />
      </label>
      <div style={modelGridStyles}>
        <label style={configRowStyles}>
          <span style={configLabelStyles}>Opus model</span>
          <input
            onChange={(event) => updateSetting("opusModel", event.target.value)}
            style={inputStyles}
            type="text"
            value={settings?.opusModel ?? ""}
          />
        </label>
        <label style={configRowStyles}>
          <span style={configLabelStyles}>Sonnet model</span>
          <input
            onChange={(event) =>
              updateSetting("sonnetModel", event.target.value)
            }
            style={inputStyles}
            type="text"
            value={settings?.sonnetModel ?? ""}
          />
        </label>
        <label style={configRowStyles}>
          <span style={configLabelStyles}>Haiku model</span>
          <input
            onChange={(event) =>
              updateSetting("haikuModel", event.target.value)
            }
            style={inputStyles}
            type="text"
            value={settings?.haikuModel ?? ""}
          />
        </label>
      </div>
      <p style={configValueStyles}>Default model: {settings?.defaultModel}</p>
      <p style={noteStyles}>
        Uses isolated home at ~/.codeai-hub/providers/glm-claude-code/home.
      </p>
    </SettingsCard>
  );
};

export default GlmClaudeCodeSettingsCard;
