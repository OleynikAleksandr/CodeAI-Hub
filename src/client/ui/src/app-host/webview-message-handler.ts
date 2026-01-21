import { useEffect } from "react";
import type {
  VoidHandler,
  WebviewDispatchHandlers,
} from "./webview-message-dispatcher";
import { dispatchWebviewMessage } from "./webview-message-dispatcher";
import { isUseProjectManagerMessage } from "./webview-message-types";

export type {
  ProviderPickerOpenHandler,
  SessionCreatedHandler,
  VoidHandler,
} from "./webview-message-dispatcher";

export type WebviewMessageHandlers = WebviewDispatchHandlers & {
  readonly onUseProjectManager?: VoidHandler;
};

export const useWebviewMessageHandler = ({
  onProviderPickerOpen,
  onSessionCreated,
  onSessionClearAll,
  onSessionFocusLast,
  onShowSettings,
  onCoreState,
  onCoreConnectionStatus,
  onCoreLoadingStatus,
  onSessionMessage,
  onSessionDeleted,
  onSessionBinding,
  onSessionHistory,
  onUseProjectManager,
}: WebviewMessageHandlers) => {
  useEffect(() => {
    const handleIncomingMessage = (event: MessageEvent<unknown>) => {
      if (isUseProjectManagerMessage(event.data)) {
        onUseProjectManager?.();
        return;
      }
      dispatchWebviewMessage(event.data, {
        onProviderPickerOpen,
        onSessionCreated,
        onSessionClearAll,
        onSessionFocusLast,
        onShowSettings,
        onCoreState,
        onCoreConnectionStatus,
        onCoreLoadingStatus,
        onSessionMessage,
        onSessionDeleted,
        onSessionBinding,
        onSessionHistory,
      });
    };

    window.addEventListener("message", handleIncomingMessage);
    return () => {
      window.removeEventListener("message", handleIncomingMessage);
    };
  }, [
    onProviderPickerOpen,
    onSessionCreated,
    onSessionClearAll,
    onSessionFocusLast,
    onShowSettings,
    onCoreState,
    onCoreConnectionStatus,
    onCoreLoadingStatus,
    onSessionMessage,
    onSessionDeleted,
    onSessionBinding,
    onSessionHistory,
    onUseProjectManager,
  ]);
};
