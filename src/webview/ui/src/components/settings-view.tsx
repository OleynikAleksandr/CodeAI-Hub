import React from "react";
import SettingsFooter from "./settings/settings-footer";
import SettingsHeader from "./settings/settings-header";
import ThinkingSettings from "./settings/thinking-settings";
import { useSettingsState } from "./settings/use-settings-state";

type SettingsViewProps = {
  readonly onClose: () => void;
};

const containerStyles: React.CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: "#1e1e1e",
  color: "#cccccc",
};

const contentStyles: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "20px",
};

const SettingsView: React.FC<SettingsViewProps> = ({ onClose }) => {
  const {
    settings,
    hasChanges,
    saving,
    resetting,
    handleThinkingSettingsChange,
    handleSave,
    handleReset,
  } = useSettingsState();

  return (
    <div style={containerStyles}>
      <SettingsHeader onClose={onClose} />
      <div style={contentStyles}>
        <ThinkingSettings
          enabled={settings.thinking.enabled}
          maxTokens={settings.thinking.maxTokens}
          onChange={handleThinkingSettingsChange}
        />
      </div>
      <SettingsFooter
        hasChanges={hasChanges}
        onClose={onClose}
        onReset={handleReset}
        onSave={handleSave}
        resetting={resetting}
        saving={saving}
      />
    </div>
  );
};

export default React.memo(SettingsView);
