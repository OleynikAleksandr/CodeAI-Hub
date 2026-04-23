import { type CSSProperties, useCallback, useEffect } from "react";
import {
  settingsColorTokens,
  settingsRadiusTokens,
  settingsSpacingTokens,
  settingsTypographyTokens,
} from "../components/settings/style-tokens";
import { useSettingsState } from "../components/settings/use-settings-state";
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

const UI_LABELS_CATEGORY = "ui_interface";
const UI_HELPER_TEXT_CATEGORY = "user_guidance";

export const SettingsOnlyHost = () => {
  const settingsState = useSettingsState();
  const localization = useResolvedLocalization(
    settingsState.settings,
    settingsState.localizationRuntime
  );
  const roleTitle = localization.t(
    UI_LABELS_CATEGORY,
    "extension_shell.role.title",
    "This extension is for install and updates only"
  );
  const roleBody = localization.t(
    UI_HELPER_TEXT_CATEGORY,
    "extension_shell.role.body",
    "The VS Code extension only installs CodeAI Hub and delivers updates. You don't need to come back here during regular work."
  );
  const roleHint = localization.t(
    UI_HELPER_TEXT_CATEGORY,
    "extension_shell.role.hint",
    "All work happens in the Project Manager app — its icon appears on your desktop after the first launch. Sessions, settings, localization, and workflow live there."
  );
  const { openSettings } = useSettingsVisibility();
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
        <main aria-label={roleTitle} style={settingsOnlyLayoutStyles}>
          <section style={settingsOnlyCardStyles}>
            <h1 style={settingsOnlyTitleStyles}>{roleTitle}</h1>
            <p style={settingsOnlyBodyStyles}>{roleBody}</p>
            <p style={settingsOnlyHintStyles}>{roleHint}</p>
          </section>
        </main>
      </div>
    </LocalizationProvider>
  );
};
