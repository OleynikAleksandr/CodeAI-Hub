import type { ProviderStackDescriptor } from "../../../../types/provider";
import type { SessionMessage, SessionRecord } from "../../../../types/session";
import { sanitizeMessage } from "../core-bridge/normalizers";
import type {
  CoreBridgeSessionBindingPayload,
  CoreBridgeSessionMessagePayload,
  CoreBridgeStatePayload,
  CoreRuntimeStatusPayload,
  ServerSessionMessage,
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
  isSessionHistoryPayload,
  isSessionMessagePayload,
  isSessionStreamPayload,
} from "./webview-message-types";

type ProviderPickerOpenHandler = (
  providers: readonly ProviderStackDescriptor[],
  stage: string | null
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
  readonly onSessionHistory?: (payload: {
    readonly sessionId: string;
    readonly messages: readonly SessionMessage[];
  }) => void;
  readonly onSessionStream?: (payload: {
    readonly sessionId: string;
    readonly event?: unknown;
  }) => void;
};

type WebviewDispatchHandlers = SessionDispatchHandlers & {
  readonly onProviderPickerOpen: ProviderPickerOpenHandler;
  readonly onShowSettings: VoidHandler;
  readonly onCoreState?: (payload: CoreBridgeStatePayload) => void;
  readonly onCoreConnectionStatus?: (status: string, detail?: string) => void;
  readonly onCoreLoadingStatus?: (payload: CoreRuntimeStatusPayload) => void;
};

const handleProviderPickerOpenMessage = (
  message: ProviderPickerOpenMessage,
  onProviderPickerOpen: ProviderPickerOpenHandler
): void => {
  const providers = parseProviderList(message.payload?.providers);
  const stage =
    typeof message.payload?.stage === "string" ? message.payload.stage : null;
  if (providers.length > 0) {
    onProviderPickerOpen(providers, stage);
    return;
  }
  if (stage) {
    onProviderPickerOpen([], stage);
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

const handleSessionHistoryMessage = (
  message: IncomingMessage,
  onSessionHistory?: (payload: {
    readonly sessionId: string;
    readonly messages: readonly SessionMessage[];
  }) => void
): void => {
  if (!(onSessionHistory && message.type === "session:history")) {
    return;
  }
  const payload = message.payload;
  if (!isSessionHistoryPayload(payload)) {
    return;
  }
  const normalized = payload.messages
    .map((candidate) => sanitizeMessage(candidate as ServerSessionMessage))
    .filter((entry): entry is SessionMessage => Boolean(entry));
  onSessionHistory({
    sessionId: payload.sessionId,
    messages: normalized,
  });
};

const handleSessionStreamMessage = (
  message: IncomingMessage,
  onSessionStream?: (payload: {
    readonly sessionId: string;
    readonly event?: unknown;
  }) => void
): void => {
  if (!(onSessionStream && message.type === "session:stream")) {
    return;
  }
  const payload = message.payload;
  if (!isSessionStreamPayload(payload)) {
    return;
  }
  onSessionStream(payload);
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
    case "session:history":
      handleSessionHistoryMessage(message, handlers.onSessionHistory);
      return true;
    case "session:stream":
      handleSessionStreamMessage(message, handlers.onSessionStream);
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

  if (
    dispatchSessionMessage(message, {
      onSessionCreated: handlers.onSessionCreated,
      onSessionClearAll: handlers.onSessionClearAll,
      onSessionFocusLast: handlers.onSessionFocusLast,
      onSessionMessage: handlers.onSessionMessage,
      onSessionDeleted: handlers.onSessionDeleted,
      onSessionBinding: handlers.onSessionBinding,
      onSessionHistory: handlers.onSessionHistory,
      onSessionStream: handlers.onSessionStream,
    })
  ) {
    return;
  }

  switch (message.type) {
    case "core:connection": {
      if (handlers.onCoreConnectionStatus && message.payload) {
        const candidate = message.payload as Record<string, unknown>;
        const status = candidate.status;
        if (typeof status === "string") {
          const detail =
            typeof candidate.detail === "string" ? candidate.detail : undefined;
          handlers.onCoreConnectionStatus(status, detail);
        }
      }
      return;
    }
    case "providerPicker:open":
      handleProviderPickerOpenMessage(message, handlers.onProviderPickerOpen);
      return;
    case "ui:showSettings":
      handlers.onShowSettings();
      return;
    case "core:state":
      handleCoreStateMessage(message, handlers.onCoreState);
      return;
    case "core:loading-status":
      handleCoreLoadingStatusMessage(message, handlers.onCoreLoadingStatus);
      return;
    default:
      return;
  }
};
