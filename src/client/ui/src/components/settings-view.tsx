import React, { useEffect, useState } from "react";
import { useLocalization } from "../app-host/use-localization";
import vscode from "../vscode";
import SettingsFooter from "./settings/settings-footer";
import SettingsHeader from "./settings/settings-header";
import {
  SettingsProviderTabContent,
  type SettingsTab,
  type SettingsViewMode,
  type SettingsViewState,
  settingsTabs,
} from "./settings/settings-provider-tab-content";
import {
  settingsColorTokens,
  settingsSpacingTokens,
  settingsTypographyTokens,
} from "./settings/style-tokens";

interface SettingsViewProps {
  readonly mode?: SettingsViewMode;
  readonly onClose: () => void;
  readonly state: SettingsViewState;
}

const containerStyles: React.CSSProperties = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  overflow: "hidden",
  position: "relative",
  background: settingsColorTokens.surface,
  color: settingsColorTokens.textSecondary,
};

const tabBarStyles: React.CSSProperties = {
  display: "flex",
  borderBottom: `1px solid ${settingsColorTokens.borderSubtle}`,
  padding: `0 ${settingsSpacingTokens.pagePadding}`,
  gap: "8px",
};

const tabButtonStyles: React.CSSProperties = {
  border: "none",
  background: "transparent",
  color: settingsColorTokens.textSecondary,
  fontSize: settingsTypographyTokens.tabFontSize,
  padding: settingsSpacingTokens.tabPadding,
  cursor: "pointer",
  borderBottom: "2px solid transparent",
};

const activeTabStyles: React.CSSProperties = {
  color: settingsColorTokens.textPrimary,
  borderBottomColor: settingsColorTokens.actionPrimary,
};

const contentStyles: React.CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: "auto",
  overscrollBehavior: "contain",
  padding: settingsSpacingTokens.pagePadding,
};

const syncOverlayStyles: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(7, 10, 16, 0.7)",
  zIndex: 10,
  padding: settingsSpacingTokens.pagePadding,
};

const syncCardStyles: React.CSSProperties = {
  maxWidth: "520px",
  width: "100%",
  borderRadius: "14px",
  border: `1px solid ${settingsColorTokens.borderStrong}`,
  background: "rgba(18, 24, 34, 0.96)",
  boxShadow: "0 18px 48px rgba(0, 0, 0, 0.35)",
  padding: "20px",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const syncSpinnerStyles: React.CSSProperties = {
  width: "30px",
  height: "30px",
  borderRadius: "999px",
  border: `3px solid ${settingsColorTokens.borderStrong}`,
  borderTopColor: settingsColorTokens.actionPrimary,
  animation: "settings-spin 0.9s linear infinite",
};

const syncTitleStyles: React.CSSProperties = {
  margin: 0,
  color: settingsColorTokens.textPrimary,
  fontSize: settingsTypographyTokens.titleFontSize,
  fontWeight: 700,
};

const syncDescriptionStyles: React.CSSProperties = {
  margin: 0,
  color: settingsColorTokens.textSecondary,
  lineHeight: 1.6,
};

const SettingsView: React.FC<SettingsViewProps> = ({
  mode = "full",
  onClose,
  state,
}) => {
  const { ready } = useLocalization();
  const [activeTab, setActiveTab] = useState<SettingsTab>("claude");
  const { hasChanges, saving, resetting, handleSave, handleReset } = state;
  const localizationSyncTitle = "Synchronizing localization";
  const localizationSyncDescription =
    state.localizationSyncStatus.message ??
    "Please wait. CodeAI Hub is rebuilding the translated interface bundles affected by this change. Project Manager and new sessions stay blocked until the affected bundles are ready.";

  useEffect(() => {
    if (typeof state.hostPostMessage !== "function") {
      return;
    }
    const previousPostMessage = vscode.postMessage;
    vscode.postMessage = (message: unknown) => {
      state.hostPostMessage?.(message);
    };
    return () => {
      vscode.postMessage = previousPostMessage;
    };
  }, [state.hostPostMessage]);

  return (
    <div aria-busy={saving || !ready} style={containerStyles}>
      <style>
        {
          "@keyframes settings-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }"
        }
      </style>
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
        <SettingsProviderTabContent
          activeTab={activeTab}
          mode={mode}
          state={state}
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
      {state.localizationSyncStatus.busy ? (
        <div aria-live="polite" role="status" style={syncOverlayStyles}>
          <div style={syncCardStyles}>
            <div style={syncSpinnerStyles} />
            <p style={syncTitleStyles}>{localizationSyncTitle}</p>
            <p style={syncDescriptionStyles}>{localizationSyncDescription}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default React.memo(SettingsView);
