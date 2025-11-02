import type { ProviderStackDescriptor } from "../../../../types/provider";
import type { SessionRecord } from "../../../../types/session";
import type {
  CoreBridgeSessionBindingPayload,
  CoreBridgeSessionMessagePayload,
  CoreBridgeStatePayload,
  CoreRuntimeStatusPayload,
} from "../core-bridge/types";
import {
  isSessionRecordCandidate,
  parseProviderList,
} from "../session/helpers";
import type {
  CoreLoadingStatusMessage,
  CoreStateMessage,
  IncomingMessage,
  ProviderPickerOpenMessage,
  SessionBindingMessage,
  SessionCreatedMessage,
  SessionDeletedMessage,
  SessionMessageEvent,
} from "./webview-message-types";
import {
  isCoreBridgeStatePayload,
  isCoreRuntimeStatusPayload,
  isIncomingMessage,
  isSessionBindingPayload,
  isSessionDeletedPayload,
  isSessionMessagePayload,
} from "./webview-message-types";

type ProviderPickerOpenHandler = (
  providers: readonly ProviderStackDescriptor[]
) => void;

type SessionCreatedHandler = (session: SessionRecord) => void;

type VoidHandler = () => void;

type SessionDispatchHandlers = {
  readonly onSessionCreated: SessionCreatedHandler;
  readonly onSessionClearAll: VoidHandler;
  readonly onSessionFocusLast: VoidHandler;
  readonly onSessionMessage?: (
    payload: CoreBridgeSessionMessagePayload
  ) => void;
  readonly onSessionDeleted?: (payload: { readonly sessionId: string }) => void;
  readonly onSessionBinding?: (
    payload: CoreBridgeSessionBindingPayload
  ) => void;
};

type WebviewDispatchHandlers = SessionDispatchHandlers & {
  readonly onProviderPickerOpen: ProviderPickerOpenHandler;
  readonly onShowSettings: VoidHandler;
  readonly onCoreState?: (payload: CoreBridgeStatePayload) => void;
  readonly onCoreConnectionStatus?: (status: string) => void;
  readonly onCoreLoadingStatus?: (payload: CoreRuntimeStatusPayload) => void;
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

const handleSessionDeletedMessage = (
  message: SessionDeletedMessage,
  onSessionDeleted?: (payload: { readonly sessionId: string }) => void
): void => {
  if (!(onSessionDeleted && isSessionDeletedPayload(message.payload))) {
    return;
  }

  onSessionDeleted(message.payload);
};

const handleSessionBindingMessage = (
  message: SessionBindingMessage,
  onSessionBinding?: (payload: CoreBridgeSessionBindingPayload) => void
): void => {
  if (!(onSessionBinding && isSessionBindingPayload(message.payload))) {
    return;
  }

  onSessionBinding(message.payload);
};

const handleCoreLoadingStatusMessage = (
  message: CoreLoadingStatusMessage,
  onCoreLoadingStatus?: (payload: CoreRuntimeStatusPayload) => void
): void => {
  if (!(onCoreLoadingStatus && isCoreRuntimeStatusPayload(message.payload))) {
    return;
  }

  onCoreLoadingStatus(message.payload);
};

const dispatchSessionMessage = (
  message: IncomingMessage,
  handlers: SessionDispatchHandlers
): boolean => {
  switch (message.type) {
    case "session:created":
      handleSessionCreatedMessage(message, handlers.onSessionCreated);
      return true;
    case "session:clearAll":
      handlers.onSessionClearAll();
      return true;
    case "session:focusLast":
      handlers.onSessionFocusLast();
      return true;
    case "session:message":
      handleSessionMessageEvent(message, handlers.onSessionMessage);
      return true;
    case "session:deleted":
      handleSessionDeletedMessage(message, handlers.onSessionDeleted);
      return true;
    case "session:binding":
      handleSessionBindingMessage(message, handlers.onSessionBinding);
      return true;
    default:
      return false;
  }
};

export type { ProviderPickerOpenHandler, SessionCreatedHandler, VoidHandler };
export type { WebviewDispatchHandlers };

export const dispatchWebviewMessage = (
  rawMessage: unknown,
  handlers: WebviewDispatchHandlers
): void => {
  if (!isIncomingMessage(rawMessage)) {
    return;
  }

  const message = rawMessage;

  if (message.type === "core:connection") {
    if (handlers.onCoreConnectionStatus && message.payload) {
      const candidate = message.payload as Record<string, unknown>;
      const status = candidate.status;
      if (typeof status === "string") {
        handlers.onCoreConnectionStatus(status);
      }
    }
    return;
  }

  if (
    dispatchSessionMessage(message, {
      onSessionCreated: handlers.onSessionCreated,
      onSessionClearAll: handlers.onSessionClearAll,
      onSessionFocusLast: handlers.onSessionFocusLast,
      onSessionMessage: handlers.onSessionMessage,
      onSessionDeleted: handlers.onSessionDeleted,
      onSessionBinding: handlers.onSessionBinding,
    })
  ) {
    return;
  }

  if (message.type === "providerPicker:open") {
    handleProviderPickerOpenMessage(message, handlers.onProviderPickerOpen);
    return;
  }

  if (message.type === "ui:showSettings") {
    handlers.onShowSettings();
    return;
  }

  if (message.type === "core:state") {
    handleCoreStateMessage(message, handlers.onCoreState);
    return;
  }

  if (message.type === "core:loading-status") {
    handleCoreLoadingStatusMessage(message, handlers.onCoreLoadingStatus);
  }
};
