import type {
  CoreBridgeSessionBindingPayload,
  CoreBridgeSessionMessagePayload,
  CoreBridgeStatePayload,
  CoreRuntimeStatusPayload,
} from "../core-bridge/types";

export interface ProviderPickerOpenMessage {
  readonly payload?: {
    readonly providers?: unknown;
    readonly stage?: unknown;
  };
  readonly type: "providerPicker:open";
}

export interface SessionCreatedMessage {
  readonly payload?: unknown;
  readonly type: "session:created";
}

export interface SessionClearAllMessage {
  readonly type: "session:clearAll";
}

export interface SessionFocusLastMessage {
  readonly type: "session:focusLast";
}

export interface ShowSettingsMessage {
  readonly type: "ui:showSettings";
}

export interface UseProjectManagerMessage {
  readonly type: "ui:useProjectManager";
}

export interface CoreStateMessage {
  readonly payload?: unknown;
  readonly type: "core:state";
}

export interface CoreConnectionPayload {
  readonly detail?: string;
  readonly status: string;
}

export interface CoreConnectionMessage {
  readonly payload?: CoreConnectionPayload;
  readonly type: "core:connection";
}

export interface CoreLoadingStatusMessage {
  readonly payload?: unknown;
  readonly type: "core:loading-status";
}

export interface SessionMessageEvent {
  readonly payload?: unknown;
  readonly type: "session:message";
}

export interface SessionDeletedMessage {
  readonly payload?: unknown;
  readonly type: "session:deleted";
}

export interface SessionBindingMessage {
  readonly payload?: unknown;
  readonly type: "session:binding";
}

export interface SessionHistoryMessage {
  readonly payload?: unknown;
  readonly type: "session:history";
}

export interface SessionStreamMessage {
  readonly payload?: unknown;
  readonly type: "session:stream";
}

export type IncomingMessage =
  | ProviderPickerOpenMessage
  | SessionCreatedMessage
  | SessionClearAllMessage
  | SessionFocusLastMessage
  | SessionBindingMessage
  | ShowSettingsMessage
  | UseProjectManagerMessage
  | CoreStateMessage
  | CoreConnectionMessage
  | CoreLoadingStatusMessage
  | SessionMessageEvent
  | SessionDeletedMessage
  | SessionHistoryMessage
  | SessionStreamMessage;

export const isIncomingMessage = (value: unknown): value is IncomingMessage =>
  Boolean(value && typeof value === "object" && "type" in value);

export const isCoreBridgeStatePayload = (
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

export const isSessionMessagePayload = (
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

export const isSessionDeletedPayload = (
  value: unknown
): value is { readonly sessionId: string } => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.sessionId === "string";
};

export const isCoreRuntimeStatusPayload = (
  value: unknown
): value is CoreRuntimeStatusPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.label === "string";
};

export const isSessionHistoryPayload = (
  value: unknown
): value is {
  readonly sessionId: string;
  readonly messages: readonly unknown[];
} => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.sessionId === "string" && Array.isArray(candidate.messages)
  );
};

export const isSessionStreamPayload = (
  value: unknown
): value is { readonly sessionId: string; readonly event?: unknown } => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.sessionId === "string";
};

export const isUseProjectManagerMessage = (
  value: unknown
): value is UseProjectManagerMessage =>
  Boolean(
    value &&
      typeof value === "object" &&
      (value as { type?: unknown }).type === "ui:useProjectManager"
  );
export const isSessionBindingPayload = (
  value: unknown
): value is CoreBridgeSessionBindingPayload => {
  if (!value || typeof value !== "object") {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  if (typeof candidate.sessionId !== "string") {
    return false;
  }
  const status = candidate.status;
  if (status !== "pending" && status !== "ready" && status !== "failed") {
    return false;
  }
  const providerSessionId = candidate.providerSessionId;
  if (providerSessionId !== null && typeof providerSessionId !== "string") {
    return false;
  }
  return true;
};
