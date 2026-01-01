import { sanitizeMessage, sanitizeSession } from "./normalizers";
import type {
  CoreBridgeSessionBindingPayload,
  CoreBridgeSessionMessagePayload,
  ServerSession,
  ServerSessionMessage,
} from "./types";

export type MessageNotifier = (message: Record<string, unknown>) => void;

type ServerEventType =
  | "session:message"
  | "session:created"
  | "session:deleted"
  | "session:stream"
  | "session:error"
  | "core:loading-status"
  | "session:binding";

type ServerEnvelope = {
  readonly type: ServerEventType;
  readonly payload: unknown;
};

type DeletedPayload = { readonly sessionId: string };
type StreamPayload = { readonly sessionId: string; readonly event?: unknown };
type BindingPayload = {
  readonly sessionId: string;
  readonly providerSessionId?: string | null;
  readonly status?: string;
};

type SessionErrorPayload = {
  readonly sessionId?: string | null;
  readonly providerId?: string;
  readonly message?: string;
};

const generateLocalMessageId = (): string => {
  if (
    typeof globalThis.crypto !== "undefined" &&
    "randomUUID" in globalThis.crypto
  ) {
    return globalThis.crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const parseEnvelope = (raw: string): ServerEnvelope | null => {
  try {
    const parsed = JSON.parse(raw) as {
      readonly type?: string;
      readonly payload?: unknown;
    };
    if (!parsed || typeof parsed.type !== "string") {
      return null;
    }
    if (
      parsed.type === "session:message" ||
      parsed.type === "session:created" ||
      parsed.type === "session:deleted" ||
      parsed.type === "session:stream" ||
      parsed.type === "session:error" ||
      parsed.type === "core:loading-status" ||
      parsed.type === "session:binding"
    ) {
      return { type: parsed.type, payload: parsed.payload };
    }
  } catch {
    return null;
  }
  return null;
};

const isDeletedPayload = (payload: unknown): payload is DeletedPayload =>
  typeof payload === "object" &&
  payload !== null &&
  typeof (payload as { readonly sessionId?: unknown }).sessionId === "string";

const isStreamPayload = (payload: unknown): payload is StreamPayload =>
  typeof payload === "object" &&
  payload !== null &&
  typeof (payload as { readonly sessionId?: unknown }).sessionId === "string";

const isSessionErrorPayload = (
  payload: unknown
): payload is SessionErrorPayload =>
  typeof payload === "object" && payload !== null;

const isBindingPayload = (payload: unknown): payload is BindingPayload => {
  if (
    typeof payload !== "object" ||
    payload === null ||
    typeof (payload as { readonly sessionId?: unknown }).sessionId !== "string"
  ) {
    return false;
  }
  const candidate = payload as BindingPayload;
  if (
    candidate.providerSessionId !== null &&
    typeof candidate.providerSessionId !== "string" &&
    typeof candidate.providerSessionId !== "undefined"
  ) {
    return false;
  }
  if (
    candidate.status &&
    candidate.status !== "pending" &&
    candidate.status !== "ready" &&
    candidate.status !== "failed"
  ) {
    return false;
  }
  return true;
};

export const createServerMessageHandler = (
  notify: MessageNotifier
): ((raw: string) => void) => {
  const handleSessionMessage = (payload: unknown): void => {
    const candidate = payload as ServerSessionMessage | undefined;
    if (!candidate || typeof candidate.sessionId !== "string") {
      return;
    }
    const normalized = sanitizeMessage(candidate);
    if (!normalized) {
      return;
    }
    notify({
      type: "session:message",
      payload: {
        sessionId: candidate.sessionId,
        message: normalized,
      } satisfies CoreBridgeSessionMessagePayload,
    });
  };

  const handleSessionCreated = (payload: unknown): void => {
    const normalized = sanitizeSession(payload as ServerSession | undefined);
    if (!normalized) {
      return;
    }
    notify({
      type: "session:created",
      payload: normalized,
    });
  };

  const handleSessionDeleted = (payload: unknown): void => {
    if (!isDeletedPayload(payload)) {
      return;
    }
    notify({
      type: "session:deleted",
      payload: { sessionId: payload.sessionId },
    });
  };

  const handleSessionStream = (payload: unknown): void => {
    if (!isStreamPayload(payload)) {
      return;
    }
    notify({
      type: "session:stream",
      payload: {
        sessionId: payload.sessionId,
        event: payload.event,
      },
    });
  };

  const handleSessionError = (payload: unknown): void => {
    if (!isSessionErrorPayload(payload)) {
      return;
    }
    const candidate = payload as SessionErrorPayload;
    const sessionId =
      typeof candidate.sessionId === "string" ? candidate.sessionId : null;
    if (!sessionId) {
      return;
    }
    const providerLabel =
      typeof candidate.providerId === "string" && candidate.providerId.trim()
        ? `[${candidate.providerId.trim()}] `
        : "";
    const message =
      typeof candidate.message === "string" && candidate.message.trim()
        ? candidate.message.trim()
        : "Unknown error.";

    notify({
      type: "session:message",
      payload: {
        sessionId,
        message: {
          id: generateLocalMessageId(),
          role: "system",
          content: `${providerLabel}${message}`,
          createdAt: Date.now(),
        },
      } satisfies CoreBridgeSessionMessagePayload,
    });
  };

  const handlers: Record<ServerEventType, (payload: unknown) => void> = {
    "session:message": handleSessionMessage,
    "session:created": handleSessionCreated,
    "session:deleted": handleSessionDeleted,
    "session:stream": handleSessionStream,
    "session:error": handleSessionError,
    "core:loading-status": (payload) => {
      notify({
        type: "core:loading-status",
        payload,
      });
    },
    "session:binding": (payload) => {
      if (!isBindingPayload(payload)) {
        return;
      }
      notify({
        type: "session:binding",
        payload: {
          sessionId: payload.sessionId,
          providerSessionId:
            typeof payload.providerSessionId === "string"
              ? payload.providerSessionId
              : null,
          status:
            payload.status === "ready" ||
            payload.status === "failed" ||
            payload.status === "pending"
              ? payload.status
              : "pending",
        } satisfies CoreBridgeSessionBindingPayload,
      });
    },
  };

  return (raw: string) => {
    const envelope = parseEnvelope(raw);
    if (!envelope) {
      return;
    }
    const handler = handlers[envelope.type];
    handler(envelope.payload);
  };
};
