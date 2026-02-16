import { api } from "../api";
import { isRecord } from "./description-questionnaire-utils";

const DEFAULT_SESSION_BINDING_TIMEOUT_MS = 60000;

type IncomingMessage = {
  readonly type: string;
  readonly payload?: unknown;
};

type SessionBindingPayload = {
  readonly sessionId: string;
  readonly providerSessionId: string | null;
  readonly status: "pending" | "ready" | "failed";
};

const extractSessionBindingPayload = (
  payload: unknown
): SessionBindingPayload | null => {
  if (!isRecord(payload) || typeof payload.sessionId !== "string") {
    return null;
  }
  const providerSessionId =
    payload.providerSessionId === null ||
    typeof payload.providerSessionId === "string"
      ? payload.providerSessionId
      : null;
  const status =
    payload.status === "pending" ||
    payload.status === "ready" ||
    payload.status === "failed"
      ? payload.status
      : "pending";
  return {
    sessionId: payload.sessionId,
    providerSessionId,
    status,
  };
};

type SessionErrorPayload = {
  readonly sessionId: string;
  readonly message: string;
};

const extractSessionErrorPayload = (payload: unknown): SessionErrorPayload | null => {
  if (!isRecord(payload) || typeof payload.sessionId !== "string") {
    return null;
  }
  const message = typeof payload.message === "string" ? payload.message : null;
  if (!message) {
    return null;
  }
  return { sessionId: payload.sessionId, message };
};

export const waitForSessionProviderBinding = (
  sessionId: string,
  options?: { readonly timeoutMs?: number }
): Promise<string> =>
  new Promise((resolve, reject) => {
    const normalizedSessionId = sessionId.trim();
    if (normalizedSessionId.length === 0) {
      reject(new Error("Session id is required."));
      return;
    }
    const timeoutMs = options?.timeoutMs ?? DEFAULT_SESSION_BINDING_TIMEOUT_MS;

    let resolved = false;
    const timeoutId = window.setTimeout(() => {
      if (resolved) {
        return;
      }
      resolved = true;
      unsubscribe();
      reject(new Error("Session binding timed out."));
    }, timeoutMs);

    const unsubscribe = api.onCoreEvent((message: IncomingMessage) => {
      if (message.type === "session:binding") {
        const payload = extractSessionBindingPayload(message.payload);
        if (!payload || payload.sessionId !== normalizedSessionId) {
          return;
        }
        if (payload.status === "failed") {
          if (resolved) {
            return;
          }
          resolved = true;
          window.clearTimeout(timeoutId);
          unsubscribe();
          reject(new Error("Provider session binding failed."));
          return;
        }
        if (
          typeof payload.providerSessionId === "string" &&
          payload.providerSessionId.trim().length > 0
        ) {
          if (resolved) {
            return;
          }
          resolved = true;
          window.clearTimeout(timeoutId);
          unsubscribe();
          resolve(payload.providerSessionId);
        }
        return;
      }
      if (message.type === "session:error") {
        const payload = extractSessionErrorPayload(message.payload);
        if (!payload || payload.sessionId !== normalizedSessionId) {
          return;
        }
        if (resolved) {
          return;
        }
        resolved = true;
        window.clearTimeout(timeoutId);
        unsubscribe();
        reject(new Error(payload.message));
      }
    });
  });

