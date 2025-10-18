import { useCallback } from "react";
import { useProviderPickerState } from "./app-host/provider-picker-state";
import { useSessionStore } from "./app-host/session-store";
import { useSettingsVisibility } from "./app-host/settings-visibility";
import { useWebviewMessageHandler } from "./app-host/webview-message-handler";
import SettingsView from "./components/settings-view";
import { ProviderPicker } from "./provider-picker";
import SessionView from "./session/session-view";

export const activateRoot = () => {
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.classList.add("active");
  }
};

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
    (providers) => {
      activateRoot();
      openPicker(providers);
    },
    [openPicker]
  );

  const handleSessionCreatedMessage = useCallback(
    (session) => {
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
    <>
      <SessionView
        activeSessionId={activeSessionId}
        onCloseSession={closeSession}
        onSelectSession={selectSession}
        onSendMessage={sendMessage}
        onToggleTodo={toggleTodo}
        providerLabels={providerLabels}
        sessions={sessions}
        snapshots={snapshots}
      />
      {settingsVisible ? (
        <div className="settings-overlay">
          <div className="settings-overlay__panel">
            <SettingsView onClose={closeSettings} />
          </div>
        </div>
      ) : null}
      <ProviderPicker
        onCancel={cancelSelection}
        onConfirm={confirmSelection}
        providers={pickerState.providers}
        visible={pickerState.visible}
      />
    </>
  );
};

export default AppHost;
