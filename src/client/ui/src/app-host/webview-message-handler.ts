import { useEffect } from "react";
import type { ProviderStackDescriptor } from "../../../../types/provider";
import type { SessionRecord } from "../../../../types/session";
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

type IncomingMessage =
  | ProviderPickerOpenMessage
  | SessionCreatedMessage
  | SessionClearAllMessage
  | SessionFocusLastMessage
  | ShowSettingsMessage;

type ProviderPickerOpenHandler = (
  providers: readonly ProviderStackDescriptor[]
) => void;

type SessionCreatedHandler = (session: SessionRecord) => void;

type VoidHandler = () => void;

export type WebviewMessageHandlers = {
  readonly onProviderPickerOpen: ProviderPickerOpenHandler;
  readonly onSessionCreated: SessionCreatedHandler;
  readonly onSessionClearAll: VoidHandler;
  readonly onSessionFocusLast: VoidHandler;
  readonly onShowSettings: VoidHandler;
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
}: WebviewMessageHandlers) => {
  useEffect(() => {
    const handleIncomingMessage = (event: MessageEvent<unknown>) => {
      if (!isIncomingMessage(event.data)) {
        return;
      }

      const message = event.data;

      switch (message.type) {
        case "providerPicker:open": {
          const providers = parseProviderList(message.payload?.providers);
          if (providers.length > 0) {
            onProviderPickerOpen(providers);
          }
          break;
        }
        case "session:created": {
          if (isSessionRecordCandidate(message.payload)) {
            onSessionCreated(message.payload);
          }
          break;
        }
        case "session:clearAll": {
          onSessionClearAll();
          break;
        }
        case "session:focusLast": {
          onSessionFocusLast();
          break;
        }
        case "ui:showSettings": {
          onShowSettings();
          break;
        }
        default:
          break;
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
  ]);
};
