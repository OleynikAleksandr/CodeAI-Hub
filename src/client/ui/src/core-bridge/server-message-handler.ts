import { sanitizeMessage, sanitizeSession } from "./normalizers";
import type {
  CoreBridgeSessionMessagePayload,
  ServerSession,
  ServerSessionMessage,
} from "./types";

export type MessageNotifier = (message: Record<string, unknown>) => void;

type ServerEventType =
  | "session:message"
  | "session:created"
  | "session:deleted"
  | "session:stream";

type ServerEnvelope = {
  readonly type: ServerEventType;
  readonly payload: unknown;
};

type DeletedPayload = { readonly sessionId: string };
type StreamPayload = { readonly sessionId: string; readonly event?: unknown };

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
      parsed.type === "session:stream"
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
      payload: normalized.record,
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

  const handlers: Record<ServerEventType, (payload: unknown) => void> = {
    "session:message": handleSessionMessage,
    "session:created": handleSessionCreated,
    "session:deleted": handleSessionDeleted,
    "session:stream": handleSessionStream,
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
