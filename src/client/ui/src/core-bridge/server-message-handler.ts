import { sanitizeMessage, sanitizeSession } from "./normalizers";
import type {
  CoreBridgeSessionBindingPayload,
  CoreBridgeSessionMessagePayload,
  CoreBridgeStatePayload,
  ServerSession,
  ServerSessionMessage,
} from "./types";

export type MessageNotifier = (message: Record<string, unknown>) => void;

type ServerEventType =
  | "session:message"
  | "session:created"
  | "session:deleted"
  | "session:stream"
  | "core:shutdown"
  | "core:loading-status"
  | "session:binding"
  | "provider:operation"
  | "core:clients"
  | "session:windowState"
  | "core:state";

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
      parsed.type === "core:shutdown" ||
      parsed.type === "core:loading-status" ||
      parsed.type === "session:binding" ||
      parsed.type === "provider:operation" ||
      parsed.type === "core:clients" ||
      parsed.type === "session:windowState" ||
      parsed.type === "core:state"
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

type CoreStateNormalizer = (payload: unknown) => CoreBridgeStatePayload | null;

export const createServerMessageHandler = (
  notify: MessageNotifier,
  normalizeCoreState?: CoreStateNormalizer
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

  const handleCoreState = (payload: unknown): void => {
    if (!normalizeCoreState) {
      return;
    }
    const normalized = normalizeCoreState(payload);
    if (!normalized) {
      return;
    }
    notify({
      type: "core:state",
      payload: normalized,
    });
  };

  const handlers: Record<ServerEventType, (payload: unknown) => void> = {
    "session:message": handleSessionMessage,
    "session:created": handleSessionCreated,
    "session:deleted": handleSessionDeleted,
    "session:stream": handleSessionStream,
    "core:shutdown": (payload) => {
      notify({
        type: "core:shutdown",
        payload,
      });
    },
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
    "provider:operation": (payload) => {
      notify({
        type: "provider:operation",
        payload,
      });
    },
    "core:clients": (payload) => {
      notify({
        type: "core:clients",
        payload,
      });
    },
    "session:windowState": (payload) => {
      notify({
        type: "session:windowState",
        payload,
      });
    },
    "core:state": handleCoreState,
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
