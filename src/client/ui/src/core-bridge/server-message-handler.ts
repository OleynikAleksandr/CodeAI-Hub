import { sanitizeMessage, sanitizeSession } from "./normalizers";
import type {
  CoreBridgeSessionMessagePayload,
  ServerSession,
  ServerSessionMessage,
} from "./types";

export type MessageNotifier = (message: Record<string, unknown>) => void;

export const createServerMessageHandler =
  (notify: MessageNotifier): ((raw: string) => void) =>
  (raw: string) => {
    let payload: { readonly type?: string; readonly payload?: unknown };
    try {
      payload = JSON.parse(raw) as { type?: string; payload?: unknown };
    } catch {
      return;
    }

    if (!payload || typeof payload.type !== "string") {
      return;
    }

    switch (payload.type) {
      case "session:message": {
        const candidate = payload.payload as ServerSessionMessage | undefined;
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
        break;
      }
      case "session:created": {
        const normalized = sanitizeSession(
          payload.payload as ServerSession | undefined
        );
        if (!normalized) {
          return;
        }
        notify({
          type: "session:created",
          payload: normalized.record,
        });
        break;
      }
      case "session:deleted": {
        const candidate = payload.payload as
          | { readonly sessionId?: string }
          | undefined;
        if (!candidate || typeof candidate.sessionId !== "string") {
          return;
        }
        notify({
          type: "session:deleted",
          payload: { sessionId: candidate.sessionId },
        });
        break;
      }
      case "session:stream": {
        const candidate = payload.payload as
          | { readonly sessionId?: string; readonly event?: unknown }
          | undefined;
        if (!candidate || typeof candidate.sessionId !== "string") {
          return;
        }
        notify({
          type: "session:stream",
          payload: {
            sessionId: candidate.sessionId,
            event: candidate.event,
          },
        });
        break;
      }
      default:
        break;
    }
  };
