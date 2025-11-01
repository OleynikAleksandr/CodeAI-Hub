import type {
  CoreBridgeSessionMessagePayload,
  CoreBridgeStatePayload,
  CoreRuntimeStatusPayload,
} from "../core-bridge/types";

export type ProviderPickerOpenMessage = {
  readonly type: "providerPicker:open";
  readonly payload?: {
    readonly providers?: unknown;
  };
};

export type SessionCreatedMessage = {
  readonly type: "session:created";
  readonly payload?: unknown;
};

export type SessionClearAllMessage = { readonly type: "session:clearAll" };

export type SessionFocusLastMessage = { readonly type: "session:focusLast" };

export type ShowSettingsMessage = { readonly type: "ui:showSettings" };

export type CoreStateMessage = {
  readonly type: "core:state";
  readonly payload?: unknown;
};

export type CoreConnectionMessage = {
  readonly type: "core:connection";
  readonly payload?: unknown;
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

export type IncomingMessage =
  | ProviderPickerOpenMessage
  | SessionCreatedMessage
  | SessionClearAllMessage
  | SessionFocusLastMessage
  | ShowSettingsMessage
  | CoreStateMessage
  | CoreConnectionMessage
  | CoreLoadingStatusMessage
  | SessionMessageEvent
  | SessionDeletedMessage;

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
