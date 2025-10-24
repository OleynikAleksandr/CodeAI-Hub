import { useCallback } from "react";
import type { ProviderStackDescriptor } from "../../../types/provider";
import type { SessionRecord } from "../../../types/session";
import { useProviderPickerState } from "./app-host/provider-picker-state";
import { useSessionStore } from "./app-host/session-store";
import { useSettingsVisibility } from "./app-host/settings-visibility";
import { useWebviewMessageHandler } from "./app-host/webview-message-handler";
import ActionBar from "./components/action-bar";
import SettingsView from "./components/settings-view";
import { ProviderPicker } from "./provider-picker";
import { activateRoot } from "./root-dom";
import SessionView from "./session/session-view";

const AppHost = () => {
  const {
    pickerState,
    providerLabels,
    openPicker,
    confirmSelection,
    cancelSelection,
    resetPicker,
  } = useProviderPickerState();

  const {
    sessions,
    snapshots,
    activeSessionId,
    handleSessionCreated,
    clearSessions,
    focusLastSession,
    selectSession,
    closeSession,
    toggleTodo,
    sendMessage,
  } = useSessionStore(providerLabels);

  const { settingsVisible, openSettings, closeSettings } =
    useSettingsVisibility();

  const handleProviderPickerOpen = useCallback(
    (providers: readonly ProviderStackDescriptor[]) => {
      activateRoot();
      openPicker(providers);
    },
    [openPicker]
  );

  const handleSessionCreatedMessage = useCallback(
    (session: SessionRecord) => {
      activateRoot();
      resetPicker();
      handleSessionCreated(session);
    },
    [handleSessionCreated, resetPicker]
  );

  const handleShowSettings = useCallback(() => {
    activateRoot();
    openSettings();
  }, [openSettings]);

  useWebviewMessageHandler({
    onProviderPickerOpen: handleProviderPickerOpen,
    onSessionCreated: handleSessionCreatedMessage,
    onSessionClearAll: clearSessions,
    onSessionFocusLast: focusLastSession,
    onShowSettings: handleShowSettings,
  });

  return (
    <div className="app-shell">
      <ActionBar />
      <div className="app-shell__session-region">
        <ProviderPicker
          onCancel={cancelSelection}
          onConfirm={confirmSelection}
          providers={pickerState.providers}
          visible={pickerState.visible}
        />
        {pickerState.visible ? null : (
          <SessionView
            activeSessionId={activeSessionId}
            onCloseSession={closeSession}
            onSelectSession={selectSession}
            onSendMessage={sendMessage}
            onToggleTodo={toggleTodo}
            providerLabels={providerLabels}
            sessions={sessions}
            showEmptyState
            snapshots={snapshots}
          />
        )}
      </div>
      {settingsVisible ? (
        <div className="settings-overlay">
          <div className="settings-overlay__panel">
            <SettingsView onClose={closeSettings} />
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default AppHost;
