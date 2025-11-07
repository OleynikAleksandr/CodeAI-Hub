import React, { useState } from "react";
import GeneralSettings from "./settings/general-settings";
import SettingsFooter from "./settings/settings-footer";
import SettingsHeader from "./settings/settings-header";
import ThinkingSettings from "./settings/thinking-settings";
import { useSettingsState } from "./settings/use-settings-state";

type SettingsViewProps = {
  readonly onClose: () => void;
};

type SettingsTab = "claude" | "codex" | "gemini" | "general";

const containerStyles: React.CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: "#1e1e1e",
  color: "#cccccc",
};

const tabBarStyles: React.CSSProperties = {
  display: "flex",
  borderBottom: "1px solid #2d2d30",
  padding: "0 20px",
  gap: "8px",
};

const tabButtonStyles: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: "#cccccc",
  fontSize: "12px",
  padding: "10px 14px",
  cursor: "pointer",
  borderBottom: "2px solid transparent",
};

const activeTabStyles: React.CSSProperties = {
  color: "#ffffff",
  borderBottomColor: "#0e639c",
};

const contentStyles: React.CSSProperties = {
  flex: 1,
  overflowY: "auto",
  padding: "20px",
};

const placeholderStyles: React.CSSProperties = {
  fontSize: "13px",
  color: "#999999",
  padding: "10px 0",
};

const settingsTabs: ReadonlyArray<{
  readonly id: SettingsTab;
  readonly label: string;
}> = [
  { id: "claude", label: "Claude" },
  { id: "codex", label: "Codex" },
  { id: "gemini", label: "Gemini" },
  { id: "general", label: "General" },
];

const SettingsView: React.FC<SettingsViewProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>("claude");
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
      <div style={tabBarStyles}>
        {settingsTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...tabButtonStyles,
              ...(activeTab === tab.id ? activeTabStyles : null),
            }}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div style={contentStyles}>
        {(() => {
          if (activeTab === "claude") {
            return (
              <ThinkingSettings
                enabled={settings.thinking.enabled}
                maxTokens={settings.thinking.maxTokens}
                onChange={handleThinkingSettingsChange}
              />
            );
          }
          if (activeTab === "general") {
            return <GeneralSettings />;
          }
          return (
            <div style={placeholderStyles}>
              Provider settings will appear here.
            </div>
          );
        })()}
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
