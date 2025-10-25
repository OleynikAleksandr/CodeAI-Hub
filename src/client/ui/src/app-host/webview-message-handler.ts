import { useEffect } from "react";
import type { ProviderStackDescriptor } from "../../../../types/provider";
import type { SessionRecord } from "../../../../types/session";
import type {
  CoreBridgeSessionMessagePayload,
  CoreBridgeStatePayload,
} from "../core-bridge/types";
import {
  isSessionRecordCandidate,
  parseProviderList,
} from "../session/helpers";

type ProviderPickerOpenMessage = {
  readonly type: "providerPicker:open";
  readonly payload?: {
    readonly providers?: unknown;
  };
};

type SessionCreatedMessage = {
  readonly type: "session:created";
  readonly payload?: unknown;
};

type SessionClearAllMessage = {
  readonly type: "session:clearAll";
};

type SessionFocusLastMessage = {
  readonly type: "session:focusLast";
};

type ShowSettingsMessage = {
  readonly type: "ui:showSettings";
};

type CoreStateMessage = {
  readonly type: "core:state";
  readonly payload?: unknown;
};

type SessionMessageEvent = {
  readonly type: "session:message";
  readonly payload?: unknown;
};

type IncomingMessage =
  | ProviderPickerOpenMessage
  | SessionCreatedMessage
  | SessionClearAllMessage
  | SessionFocusLastMessage
  | ShowSettingsMessage
  | CoreStateMessage
  | SessionMessageEvent;

type ProviderPickerOpenHandler = (
  providers: readonly ProviderStackDescriptor[]
) => void;

type SessionCreatedHandler = (session: SessionRecord) => void;

type VoidHandler = () => void;

const isCoreBridgeStatePayload = (
  value: unknown
): value is CoreBridgeStatePayload => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    Array.isArray(candidate.sessions) && Array.isArray(candidate.providers)
  );
};

const isSessionMessagePayload = (
  value: unknown
): value is CoreBridgeSessionMessagePayload => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.sessionId !== "string") {
    return false;
  }
  const message = candidate.message;
  if (!message || typeof message !== "object") {
    return false;
  }
  const messageCandidate = message as Record<string, unknown>;
  return (
    typeof messageCandidate.id === "string" &&
    typeof messageCandidate.content === "string" &&
    typeof messageCandidate.createdAt === "number"
  );
};

const handleProviderPickerOpenMessage = (
  message: ProviderPickerOpenMessage,
  onProviderPickerOpen: ProviderPickerOpenHandler
): void => {
  const providers = parseProviderList(message.payload?.providers);
  if (providers.length > 0) {
    onProviderPickerOpen(providers);
  }
};

const handleSessionCreatedMessage = (
  message: SessionCreatedMessage,
  onSessionCreated: SessionCreatedHandler
): void => {
  if (isSessionRecordCandidate(message.payload)) {
    onSessionCreated(message.payload);
  }
};

const handleCoreStateMessage = (
  message: CoreStateMessage,
  onCoreState?: (payload: CoreBridgeStatePayload) => void
): void => {
  if (!(onCoreState && isCoreBridgeStatePayload(message.payload))) {
    return;
  }

  onCoreState(message.payload);
};

const handleSessionMessageEvent = (
  message: SessionMessageEvent,
  onSessionMessage?: (payload: CoreBridgeSessionMessagePayload) => void
): void => {
  if (!(onSessionMessage && isSessionMessagePayload(message.payload))) {
    return;
  }

  onSessionMessage(message.payload);
};

export type WebviewMessageHandlers = {
  readonly onProviderPickerOpen: ProviderPickerOpenHandler;
  readonly onSessionCreated: SessionCreatedHandler;
  readonly onSessionClearAll: VoidHandler;
  readonly onSessionFocusLast: VoidHandler;
  readonly onShowSettings: VoidHandler;
  readonly onCoreState?: (payload: CoreBridgeStatePayload) => void;
  readonly onSessionMessage?: (
    payload: CoreBridgeSessionMessagePayload
  ) => void;
};

const isIncomingMessage = (value: unknown): value is IncomingMessage => {
  if (!value || typeof value !== "object" || !("type" in value)) {
    return false;
  }
  return true;
};

export const useWebviewMessageHandler = ({
  onProviderPickerOpen,
  onSessionCreated,
  onSessionClearAll,
  onSessionFocusLast,
  onShowSettings,
  onCoreState,
  onSessionMessage,
}: WebviewMessageHandlers) => {
  useEffect(() => {
    const handleIncomingMessage = (event: MessageEvent<unknown>) => {
      if (!isIncomingMessage(event.data)) {
        return;
      }

      const message = event.data;

      switch (message.type) {
        case "providerPicker:open":
          handleProviderPickerOpenMessage(message, onProviderPickerOpen);
          return;
        case "session:created":
          handleSessionCreatedMessage(message, onSessionCreated);
          return;
        case "session:clearAll":
          onSessionClearAll();
          return;
        case "session:focusLast":
          onSessionFocusLast();
          return;
        case "ui:showSettings":
          onShowSettings();
          return;
        case "core:state":
          handleCoreStateMessage(message, onCoreState);
          return;
        case "session:message":
          handleSessionMessageEvent(message, onSessionMessage);
          return;
        default:
          return;
      }
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
    onSessionMessage,
  ]);
};
