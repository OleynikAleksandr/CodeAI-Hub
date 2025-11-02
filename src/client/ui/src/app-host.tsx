import { useCallback, useEffect, useMemo, useState } from "react";
import type { ProviderStackDescriptor } from "../../../types/provider";
import type { SessionRecord } from "../../../types/session";
import {
  createDefaultMessages,
  DEFAULT_MESSAGES,
  type LoadingMessage,
  MESSAGE_ORDER,
  MESSAGE_ROTATION_INTERVAL_MS,
  type MessageId,
  resolveMessageId,
} from "./app-host/loading-messages";
import { useProviderPickerState } from "./app-host/provider-picker-state";
import { useSessionStore } from "./app-host/session-store";
import { useSettingsVisibility } from "./app-host/settings-visibility";
import { useWebviewMessageHandler } from "./app-host/webview-message-handler";
import ActionBar from "./components/action-bar";
import SettingsView from "./components/settings-view";
import type {
  CoreBridgeSessionBindingPayload,
  CoreBridgeSessionMessagePayload,
  CoreBridgeStatePayload,
} from "./core-bridge/types";
import { ProviderPicker } from "./provider-picker";
import { activateRoot } from "./root-dom";
import SessionView from "./session/session-view";

const AppHost = () => {
  const [coreStatus, setCoreStatus] = useState<
    "connecting" | "ready" | "error"
  >("connecting");
  const [coreFinalized, setCoreFinalized] = useState(false);
  const [messages, setMessages] = useState<Record<MessageId, LoadingMessage>>(
    createDefaultMessages
  );
  const [activeMessageIndex, setActiveMessageIndex] = useState(0);

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
    hydrateFromCoreState,
    handleSessionMessageEvent,
    handleSessionDeleted,
    handleSessionBindingUpdate,
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

  const handleCoreState = useCallback(
    (payload: CoreBridgeStatePayload) => {
      activateRoot();
      hydrateFromCoreState(payload);
    },
    [hydrateFromCoreState]
  );

  const handleSessionMessage = useCallback(
    (payload: CoreBridgeSessionMessagePayload) => {
      activateRoot();
      handleSessionMessageEvent(payload);
    },
    [handleSessionMessageEvent]
  );

  const handleSessionDeletedMessage = useCallback(
    (payload: { readonly sessionId: string }) => {
      activateRoot();
      handleSessionDeleted(payload);
    },
    [handleSessionDeleted]
  );

  const handleSessionBindingMessage = useCallback(
    (payload: CoreBridgeSessionBindingPayload) => {
      activateRoot();
      handleSessionBindingUpdate(payload);
    },
    [handleSessionBindingUpdate]
  );

  useWebviewMessageHandler({
    onProviderPickerOpen: handleProviderPickerOpen,
    onSessionCreated: handleSessionCreatedMessage,
    onSessionClearAll: clearSessions,
    onSessionFocusLast: focusLastSession,
    onShowSettings: handleShowSettings,
    onCoreState: handleCoreState,
    onCoreConnectionStatus: (status) => {
      if (status === "connecting" || status === "ready" || status === "error") {
        setCoreStatus(status);
        if (status === "connecting") {
          setCoreFinalized(false);
          setMessages(createDefaultMessages());
          setActiveMessageIndex(0);
        }
      }
    },
    onCoreLoadingStatus: (status) => {
      if (status.phase === "finalize") {
        setCoreFinalized(true);
        return;
      }

      const scopeValue =
        typeof status.scope === "string" ? status.scope : undefined;
      const messageId = resolveMessageId(scopeValue, status.phase);
      if (!messageId) {
        return;
      }

      setMessages((prev) => {
        const next = { ...prev };
        const fallback = { ...DEFAULT_MESSAGES[messageId] };
        const detail =
          status.detail ??
          (status.firstRun
            ? "This may take a little longer on the first run."
            : (next[messageId]?.detail ?? fallback.detail));
        next[messageId] = {
          id: messageId,
          status: status.label ?? next[messageId]?.status ?? fallback.status,
          detail,
        };
        return next;
      });
    },
    onSessionMessage: handleSessionMessage,
    onSessionDeleted: handleSessionDeletedMessage,
    onSessionBinding: handleSessionBindingMessage,
  });

  const isCoreReady = coreStatus === "ready" && coreFinalized;

  useEffect(() => {
    if (isCoreReady) {
      return;
    }
    const timer = window.setInterval(() => {
      setActiveMessageIndex(
        (previous) => (previous + 1) % MESSAGE_ORDER.length
      );
    }, MESSAGE_ROTATION_INTERVAL_MS);
    return () => {
      window.clearInterval(timer);
    };
  }, [isCoreReady]);

  const currentMessage = useMemo(() => {
    const messageId = MESSAGE_ORDER[activeMessageIndex];
    return messages[messageId] ?? DEFAULT_MESSAGES[messageId];
  }, [activeMessageIndex, messages]);

  const { headlineText, statusLine, detailLine } = useMemo(() => {
    if (coreStatus === "error") {
      return {
        headlineText: "Please hold on - we are getting CodeAI Hub ready.",
        statusLine: "Unable to reach CodeAI Hub core. Retrying...",
        detailLine: undefined,
      };
    }
    return {
      headlineText: "Please hold on - we are getting CodeAI Hub ready.",
      statusLine: currentMessage.status,
      detailLine: currentMessage.detail,
    };
  }, [coreStatus, currentMessage]);

  return (
    <div className="app-shell">
      <ActionBar disabled={!isCoreReady} />
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
      {isCoreReady ? null : (
        <div className="app-shell__status-overlay">
          <output aria-live="polite" className="app-shell__status-card">
            <span aria-hidden="true" className="app-shell__status-indicator" />
            <span className="app-shell__status-text">
              <span className="app-shell__status-line">{headlineText}</span>
              <span className="app-shell__status-line">{statusLine}</span>
              {detailLine ? (
                <span className="app-shell__status-line app-shell__status-line--muted">
                  {detailLine}
                </span>
              ) : null}
            </span>
          </output>
        </div>
      )}
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
