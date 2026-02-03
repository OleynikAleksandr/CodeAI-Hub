import { type CSSProperties, useCallback, useEffect } from "react";
import SettingsView from "../components/settings-view";
import { activateRoot } from "../root-dom";
import { useSettingsVisibility } from "./settings-visibility";
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
  background: "rgb(24, 24, 24)",
  color: "var(--vscode-editor-foreground, #cccccc)",
};

const settingsOnlyCardStyles: CSSProperties = {
  width: "100%",
  maxWidth: "520px",
  borderRadius: "16px",
  padding: "24px",
  background: "var(--vscode-editorWidget-background, #252526)",
  border: "1px solid var(--vscode-editorWidget-border, #2a2a2a)",
  boxShadow: "0 12px 32px rgba(0, 0, 0, 0.35)",
  display: "flex",
  flexDirection: "column",
  gap: "12px",
};

const settingsOnlyTitleStyles: CSSProperties = {
  margin: 0,
  fontSize: "20px",
  fontWeight: 600,
  color: "var(--vscode-editor-foreground, #ffffff)",
};

const settingsOnlyBodyStyles: CSSProperties = {
  margin: 0,
  fontSize: "14px",
  lineHeight: 1.5,
};

const settingsOnlyHintStyles: CSSProperties = {
  margin: 0,
  fontSize: "12px",
  color: "var(--vscode-descriptionForeground, #9aa0a6)",
};

const settingsOnlyButtonStyles: CSSProperties = {
  alignSelf: "flex-start",
  marginTop: "4px",
  padding: "8px 14px",
  borderRadius: "6px",
  border: "1px solid #3a3a3a",
  background: "#0e639c",
  color: "#ffffff",
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
            <SettingsView mode="settings-only" onClose={closeSettings} />
          </div>
        </div>
      ) : null}
    </div>
  );
};
