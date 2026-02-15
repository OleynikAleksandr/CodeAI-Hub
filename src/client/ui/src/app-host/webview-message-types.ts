import type {
  CoreBridgeSessionBindingPayload,
  CoreBridgeSessionMessagePayload,
  CoreBridgeStatePayload,
  CoreRuntimeStatusPayload,
} from "../core-bridge/types";

export type ProviderPickerOpenMessage = {
  readonly type: "providerPicker:open";
  readonly payload?: {
    readonly providers?: unknown;
    readonly stage?: unknown;
  };
};

export type SessionCreatedMessage = {
  readonly type: "session:created";
  readonly payload?: unknown;
};

export type SessionClearAllMessage = { readonly type: "session:clearAll" };

export type SessionFocusLastMessage = { readonly type: "session:focusLast" };

export type ShowSettingsMessage = { readonly type: "ui:showSettings" };

export type UseProjectManagerMessage = {
  readonly type: "ui:useProjectManager";
};

export type CoreStateMessage = {
  readonly type: "core:state";
  readonly payload?: unknown;
};

export type CoreConnectionPayload = {
  readonly status: string;
  readonly detail?: string;
};

export type CoreConnectionMessage = {
  readonly type: "core:connection";
  readonly payload?: CoreConnectionPayload;
};

export type CoreLoadingStatusMessage = {
  readonly type: "core:loading-status";
  readonly payload?: unknown;
};

export type SessionMessageEvent = {
  readonly type: "session:message";
  readonly payload?: unknown;
};

export type SessionDeletedMessage = {
  readonly type: "session:deleted";
  readonly payload?: unknown;
};

export type SessionBindingMessage = {
  readonly type: "session:binding";
  readonly payload?: unknown;
};

export type SessionHistoryMessage = {
  readonly type: "session:history";
  readonly payload?: unknown;
};

export type SessionStreamMessage = {
  readonly type: "session:stream";
  readonly payload?: unknown;
};

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
