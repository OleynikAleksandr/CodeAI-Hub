import type { CSSProperties, FC } from "react";
import type {
  GlmNativeReasoningEffort,
  GlmNativeSettings,
} from "./kimi-settings-state";
import SettingsCard from "./settings-card";
import {
  descriptionStyles,
  modelDescriptionStyles,
  modelInfoStyles,
  modelTitleStyles,
  rowBaseStyles,
  rowSelectedStyles,
} from "./shared-model-card-styles";

interface GlmNativeSettingsCardProps {
  readonly onSettingsChange?: (settings: GlmNativeSettings) => void;
  readonly onThinkingDisplaySyncChange?: (enabled: boolean) => void;
  readonly settings?: GlmNativeSettings;
  readonly thinkingDisplaySyncEnabled?: boolean;
}

const toggleStyles: CSSProperties = {
  alignItems: "flex-start",
  display: "flex",
  gap: "12px",
  margin: "4px 0 8px",
};

const checkboxStyles: CSSProperties = {
  cursor: "pointer",
  height: "16px",
  marginTop: "2px",
  width: "16px",
};

const mutedTextStyles: CSSProperties = {
  color: "#999999",
  fontSize: "12px",
  lineHeight: 1.4,
};

const rowStyles: CSSProperties = {
  display: "grid",
  gap: "4px",
  margin: "8px 0",
};

const labelStyles: CSSProperties = {
  color: "#999999",
  fontSize: "12px",
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

const GLM_REASONING_EFFORTS: readonly GlmNativeReasoningEffort[] = [
  "max",
  "xhigh",
  "high",
  "medium",
  "low",
  "minimal",
  "none",
];

const GlmNativeSettingsCard: FC<GlmNativeSettingsCardProps> = ({
  onSettingsChange,
  onThinkingDisplaySyncChange,
  settings,
  thinkingDisplaySyncEnabled = true,
}) => {
  const updateSetting = (
    key: keyof GlmNativeSettings,
    value: GlmNativeSettings[keyof GlmNativeSettings]
  ) => {
    if (settings) {
      onSettingsChange?.({ ...settings, [key]: value });
    }
  };

  return (
    <SettingsCard title="GLM">
      <p style={descriptionStyles}>
        Runs GLM 5.2 through the native Z.AI Coding Chat Completions API.
      </p>
      <label style={toggleStyles}>
        <input
          checked={settings?.thinkingEnabled ?? true}
          onChange={(event) =>
            updateSetting("thinkingEnabled", event.target.checked)
          }
          style={checkboxStyles}
          type="checkbox"
        />
        <div>
          <div style={{ fontSize: "13px", fontWeight: 600 }}>
            Reasoning enabled
          </div>
          <div style={mutedTextStyles}>
            Send GLM requests with thinking enabled.
          </div>
        </div>
      </label>
      <label style={rowStyles}>
        <span style={labelStyles}>Reasoning level</span>
        <select
          onChange={(event) =>
            updateSetting(
              "reasoningEffort",
              event.target.value as GlmNativeReasoningEffort
            )
          }
          style={inputStyles}
          value={settings?.reasoningEffort ?? "max"}
        >
          {GLM_REASONING_EFFORTS.map((effort) => (
            <option key={effort} value={effort}>
              {effort}
            </option>
          ))}
        </select>
      </label>
      <label style={toggleStyles}>
        <input
          checked={thinkingDisplaySyncEnabled}
          onChange={(event) =>
            onThinkingDisplaySyncChange?.(event.target.checked)
          }
          style={checkboxStyles}
          type="checkbox"
        />
        <div>
          <div style={{ fontSize: "13px", fontWeight: 600 }}>
            Reasoning in dialog
          </div>
          <div style={mutedTextStyles}>
            Show GLM reasoning as a normal assistant bubble in the dialog.
          </div>
        </div>
      </label>
      <label style={rowStyles}>
        <span style={labelStyles}>Z.AI API key</span>
        <input
          autoComplete="off"
          onChange={(event) => updateSetting("apiKey", event.target.value)}
          placeholder="zai-..."
          style={inputStyles}
          type="password"
          value={settings?.apiKey ?? ""}
        />
      </label>
      <label style={rowStyles}>
        <span style={labelStyles}>Base URL</span>
        <input
          onChange={(event) => updateSetting("baseUrl", event.target.value)}
          style={inputStyles}
          type="text"
          value={settings?.baseUrl ?? ""}
        />
      </label>
      <div style={{ ...rowBaseStyles, ...rowSelectedStyles, border: "none" }}>
        <div style={modelInfoStyles}>
          <div style={modelTitleStyles}>GLM 5.2</div>
          <div style={modelDescriptionStyles}>glm-5.2</div>
        </div>
      </div>
    </SettingsCard>
  );
};

export default GlmNativeSettingsCard;
