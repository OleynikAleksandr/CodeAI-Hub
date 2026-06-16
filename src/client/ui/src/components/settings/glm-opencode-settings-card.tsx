import type { CSSProperties, FC } from "react";
import {
  GLM_OPENCODE_MODEL_OPTIONS,
  type GlmOpenCodeModelId,
  type GlmOpenCodeSettings,
} from "./kimi-settings-state";
import SettingsCard from "./settings-card";
import {
  descriptionStyles,
  listStyles,
  modelDescriptionStyles,
  modelInfoStyles,
  modelTitleStyles,
  noteStyles,
  rowBaseStyles,
  rowSelectedStyles,
} from "./shared-model-card-styles";

interface GlmOpenCodeSettingsCardProps {
  readonly onSettingsChange?: (settings: GlmOpenCodeSettings) => void;
  readonly onThinkingDisplaySyncChange?: (enabled: boolean) => void;
  readonly settings?: GlmOpenCodeSettings;
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

const titleStyles: CSSProperties = {
  fontSize: "13px",
  fontWeight: 600,
  marginBottom: "4px",
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

const GlmOpenCodeSettingsCard: FC<GlmOpenCodeSettingsCardProps> = ({
  onSettingsChange,
  onThinkingDisplaySyncChange,
  settings,
  thinkingDisplaySyncEnabled = true,
}) => {
  const updateSetting = (key: keyof GlmOpenCodeSettings, value: string) => {
    if (!settings) {
      return;
    }
    onSettingsChange?.({ ...settings, [key]: value });
  };
  const updateDefaultModel = (defaultModel: GlmOpenCodeModelId) => {
    if (!settings) {
      return;
    }
    onSettingsChange?.({ ...settings, defaultModel });
  };

  return (
    <SettingsCard title="OpenCode">
      <p style={descriptionStyles}>
        Runs models already configured in OpenCode. Tested selectors:
        zai-coding-plan/glm-5.2 and kimi-for-coding/k2p7.
      </p>
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
          <div style={titleStyles}>Reasoning in dialog</div>
          <div style={mutedTextStyles}>
            Show OpenCode reasoning as a normal assistant bubble in the dialog.
          </div>
        </div>
      </label>
      <label style={rowStyles}>
        <span style={labelStyles}>Optional Z.AI API key</span>
        <input
          autoComplete="off"
          onChange={(event) => updateSetting("apiKey", event.target.value)}
          placeholder="Optional; OpenCode auth is used first"
          style={inputStyles}
          type="password"
          value={settings?.apiKey ?? ""}
        />
      </label>
      <label style={rowStyles}>
        <span style={labelStyles}>Config</span>
        <input
          onChange={(event) => updateSetting("configPath", event.target.value)}
          style={inputStyles}
          type="text"
          value={settings?.configPath ?? ""}
        />
      </label>
      <div style={rowStyles}>
        <span style={labelStyles}>Default model</span>
        <div style={listStyles}>
          {GLM_OPENCODE_MODEL_OPTIONS.map((option) => {
            const selected = settings?.defaultModel === option.id;
            return (
              <button
                aria-pressed={selected}
                key={option.id}
                onClick={() => updateDefaultModel(option.id)}
                style={{
                  ...rowBaseStyles,
                  border: "none",
                  textAlign: "left",
                  width: "100%",
                  ...(selected ? rowSelectedStyles : {}),
                }}
                type="button"
              >
                <div style={modelInfoStyles}>
                  <div style={modelTitleStyles}>{option.label}</div>
                  <div style={modelDescriptionStyles}>
                    {option.description}: {option.id}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
      <p style={noteStyles}>
        Uses isolated home at
        .codeai-hub/&lt;workspace&gt;/runtime/providers/opencode/home.
      </p>
    </SettingsCard>
  );
};

export default GlmOpenCodeSettingsCard;
