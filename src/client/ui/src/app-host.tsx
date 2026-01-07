import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../../types/provider";
import type { SessionMessage, SessionRecord } from "../../../types/session";
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
import { SessionRegion } from "./app-host/session-region";
import { useSessionStore } from "./app-host/session-store";
import { useSettingsVisibility } from "./app-host/settings-visibility";
import { useIdeaCollector } from "./app-host/use-idea-collector";
import { useWebviewMessageHandler } from "./app-host/webview-message-handler";
import ActionBar from "./components/action-bar";
import SettingsView from "./components/settings-view";
import type {
  CoreBridgeSessionBindingPayload,
  CoreBridgeSessionMessagePayload,
  CoreBridgeStatePayload,
} from "./core-bridge/types";
import { activateRoot } from "./root-dom";

const AppHost = () => {
  const [coreStatus, setCoreStatus] = useState<
    "connecting" | "ready" | "error"
  >("connecting");
  const [coreStatusDetail, setCoreStatusDetail] = useState<string | undefined>(
    undefined
  );
  const [coreFinalized, setCoreFinalized] = useState(false);
  const [messages, setMessages] = useState<Record<MessageId, LoadingMessage>>(
    createDefaultMessages
  );
  const [activeMessageIndex, setActiveMessageIndex] = useState(0);
  const {
    pickerState,
    providerLabels,
    selectedStage,
    openPicker,
    confirmSelection,
    cancelSelection,
    resetPicker,
    selectStage,
    clearStageSelection,
  } = useProviderPickerState();
  const {
    sessions,
    snapshots,
    activeSessionId,
    handleSessionCreated,
    hydrateFromCoreState,
    handleSessionMessageEvent,
    handleSessionHistoryEvent,
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
  const shouldKickoffIdeaRef = useRef(false);
  const {
    startCollection: startIdeaCollection,
    sendMessage: sendIdeaCollectorMessage,
  } = useIdeaCollector(sendMessage);

  const handleProviderPickerOpen = useCallback(
    (providers: readonly ProviderStackDescriptor[]) => {
      activateRoot();
      openPicker(providers);
    },
    [openPicker]
  );

  const confirmSelectionFromUi = useCallback(
    (providerIds: readonly ProviderStackId[]) => {
      shouldKickoffIdeaRef.current =
        selectedStage === "idea" &&
        (providerIds[0] === "codexCli" || providerIds[0] === "claudeCodeCli");
      confirmSelection(providerIds);
    },
    [confirmSelection, selectedStage]
  );

  const handleSessionCreatedMessage = useCallback(
    (session: SessionRecord) => {
      activateRoot();
      resetPicker();
      handleSessionCreated(session);
      if (shouldKickoffIdeaRef.current) {
        shouldKickoffIdeaRef.current = false;
        startIdeaCollection(session.id);
      }
    },
    [handleSessionCreated, resetPicker, startIdeaCollection]
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

  const handleSessionHistory = useCallback(
    (payload: {
      readonly sessionId: string;
      readonly messages: readonly SessionMessage[];
    }) => {
      activateRoot();
      handleSessionHistoryEvent(payload);
    },
    [handleSessionHistoryEvent]
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
    onCoreConnectionStatus: (status, detail) => {
      if (status === "connecting" || status === "ready" || status === "error") {
        setCoreStatus(status);
        setCoreStatusDetail(detail);
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
    onSessionHistory: handleSessionHistory,
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
        statusLine:
          coreStatusDetail ?? "Unable to reach CodeAI Hub core. Retrying...",
        detailLine: undefined,
      };
    }
    return {
      headlineText: "Please hold on - we are getting CodeAI Hub ready.",
      statusLine: currentMessage.status,
      detailLine: coreStatusDetail ?? currentMessage.detail,
    };
  }, [coreStatus, coreStatusDetail, currentMessage]);

  return (
    <div className="app-shell">
      <ActionBar disabled={!isCoreReady} />
      <SessionRegion
        cancelSelection={cancelSelection}
        clearStageSelection={clearStageSelection}
        confirmSelection={confirmSelectionFromUi}
        pickerState={pickerState}
        selectedStage={selectedStage}
        selectStage={selectStage}
        sessionViewProps={{
          activeSessionId,
          coreConnectionDetail: coreStatusDetail,
          coreConnectionStatus: coreStatus,
          onCloseSession: closeSession,
          onSelectSession: selectSession,
          onSendMessage: sendIdeaCollectorMessage,
          onToggleTodo: toggleTodo,
          providerLabels,
          sessions,
          snapshots,
        }}
      />
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
