import { type CSSProperties, useCallback, useEffect } from "react";
import {
  settingsColorTokens,
  settingsRadiusTokens,
  settingsSpacingTokens,
  settingsTypographyTokens,
} from "../components/settings/style-tokens";
import { useSettingsState } from "../components/settings/use-settings-state";
import SettingsView from "../components/settings-view";
import { activateRoot } from "../root-dom";
import { useSettingsVisibility } from "./settings-visibility";
import {
  LocalizationProvider,
  useResolvedLocalization,
} from "./use-localization";
import {
  useWebviewMessageHandler,
  type WebviewMessageHandlers,
} from "./webview-message-handler";

const settingsOnlyLayoutStyles: CSSProperties = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "32px 24px",
  background: settingsColorTokens.surface,
  color: "var(--vscode-editor-foreground, #cccccc)",
};

const settingsOnlyCardStyles: CSSProperties = {
  width: "100%",
  maxWidth: "520px",
  borderRadius: settingsRadiusTokens.card,
  padding: settingsSpacingTokens.cardPadding,
  background: "var(--vscode-editorWidget-background, #252526)",
  border: `1px solid ${settingsColorTokens.borderSubtle}`,
  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const settingsOnlyTitleStyles: CSSProperties = {
  margin: 0,
  fontSize: settingsTypographyTokens.hostTitleFontSize,
  fontWeight: 600,
  color: settingsColorTokens.textPrimary,
};

const settingsOnlyBodyStyles: CSSProperties = {
  margin: 0,
  fontSize: settingsTypographyTokens.hostBodyFontSize,
  lineHeight: 1.5,
};

const settingsOnlyHintStyles: CSSProperties = {
  margin: 0,
  fontSize: settingsTypographyTokens.bodyFontSize,
  color: settingsColorTokens.textMuted,
};

const settingsOnlyButtonStyles: CSSProperties = {
  alignSelf: "flex-start",
  marginTop: "4px",
  padding: "8px 14px",
  borderRadius: settingsRadiusTokens.control,
  border: `1px solid ${settingsColorTokens.borderStrong}`,
  background: settingsColorTokens.actionPrimary,
  color: settingsColorTokens.actionPrimaryText,
  fontSize: "13px",
  cursor: "pointer",
};

const noopProviderPickerOpen: WebviewMessageHandlers["onProviderPickerOpen"] =
  () => {
    // no-op
  };
const noopSessionCreated: WebviewMessageHandlers["onSessionCreated"] = () => {
  // no-op
};
const noopVoidHandler: WebviewMessageHandlers["onSessionClearAll"] = () => {
  // no-op
};

export const SettingsOnlyHost = () => {
  const settingsState = useSettingsState();
  const localization = useResolvedLocalization(
    settingsState.settings,
    settingsState.localizationRuntime
  );
  const { settingsVisible, openSettings, closeSettings } =
    useSettingsVisibility();
  const handleShowSettings = useCallback(() => {
    activateRoot();
    openSettings();
  }, [openSettings]);

  useEffect(() => {
    activateRoot();
  }, []);

  useWebviewMessageHandler({
    onProviderPickerOpen: noopProviderPickerOpen,
    onSessionCreated: noopSessionCreated,
    onSessionClearAll: noopVoidHandler,
    onSessionFocusLast: noopVoidHandler,
    onShowSettings: handleShowSettings,
  });

  return (
    <LocalizationProvider value={localization}>
      <div className="app-shell">
        <main aria-label="Settings only mode" style={settingsOnlyLayoutStyles}>
          <section style={settingsOnlyCardStyles}>
            <h1 style={settingsOnlyTitleStyles}>Settings only</h1>
            <p style={settingsOnlyBodyStyles}>
              Sessions and chats are available in Project Manager.
            </p>
            <p style={settingsOnlyHintStyles}>
              Use this panel to configure providers and defaults.
            </p>
            <button
              onClick={handleShowSettings}
              style={settingsOnlyButtonStyles}
              type="button"
            >
              Open settings
            </button>
          </section>
        </main>
        {settingsVisible ? (
          <div className="settings-overlay">
            <div className="settings-overlay__panel">
              <SettingsView
                mode="settings-only"
                onClose={closeSettings}
                state={settingsState}
              />
            </div>
          </div>
        ) : null}
      </div>
    </LocalizationProvider>
  );
};
