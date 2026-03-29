import {
  createSystemSessionMessage,
  sanitizeSession,
  sanitizeSessionBindingPayload,
  sanitizeSessionErrorPayload,
  sanitizeSessionMessagePayload,
} from "./normalizers";
import type {
  CoreBridgeSessionBindingPayload,
  CoreBridgeSessionMessagePayload,
  ServerSession,
} from "./types";

export type MessageNotifier = (message: Record<string, unknown>) => void;

type ServerEventType =
  | "session:message"
  | "session:created"
  | "session:deleted"
  | "session:stream"
  | "session:error"
  | "core:loading-status"
  | "session:binding"
  | "session:model:update";

interface ServerEnvelope {
  readonly payload: unknown;
  readonly type: ServerEventType;
}

interface DeletedPayload {
  readonly sessionId: string;
}
interface StreamPayload {
  readonly event?: unknown;
  readonly sessionId: string;
}
interface ModelUpdatePayload {
  readonly baseModelId?: string;
  readonly modelId: string;
  readonly providerId: string;
  readonly sessionId: string;
}

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
      parsed.type === "session:binding" ||
      parsed.type === "session:model:update"
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

const isModelUpdatePayload = (
  payload: unknown
): payload is ModelUpdatePayload =>
  typeof payload === "object" &&
  payload !== null &&
  typeof (payload as { readonly sessionId?: unknown }).sessionId === "string" &&
  typeof (payload as { readonly providerId?: unknown }).providerId ===
    "string" &&
  typeof (payload as { readonly modelId?: unknown }).modelId === "string";

export const createServerMessageHandler = (
  notify: MessageNotifier
): ((raw: string) => void) => {
  const handleSessionMessage = (payload: unknown): void => {
    const normalized = sanitizeSessionMessagePayload(payload);
    if (!normalized) {
      return;
    }
    notify({
      type: "session:message",
      payload: normalized satisfies CoreBridgeSessionMessagePayload,
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

  const handleSessionModelUpdate = (payload: unknown): void => {
    if (!isModelUpdatePayload(payload)) {
      return;
    }
    notify({
      type: "session:stream",
      payload: {
        sessionId: payload.sessionId,
        event: {
          type: "stream_event",
          data: {
            kind: "model_update",
            providerId: payload.providerId,
            modelId: payload.modelId,
            ...(typeof payload.baseModelId === "string"
              ? { baseModelId: payload.baseModelId }
              : {}),
          },
        },
      },
    });
  };

  const handleSessionError = (payload: unknown): void => {
    const normalized = sanitizeSessionErrorPayload(payload);
    if (!normalized) {
      return;
    }

    notify({
      type: "session:message",
      payload: {
        sessionId: normalized.sessionId,
        message: createSystemSessionMessage(normalized.message),
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
      const normalized = sanitizeSessionBindingPayload(payload);
      if (!normalized) {
        return;
      }
      notify({
        type: "session:binding",
        payload: normalized satisfies CoreBridgeSessionBindingPayload,
      });
    },
    "session:model:update": handleSessionModelUpdate,
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
