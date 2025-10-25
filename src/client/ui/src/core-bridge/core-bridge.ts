import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../../../types/provider";
import {
  convertStatusResponse,
  sanitizeMessage,
  sanitizeSession,
} from "./normalizers";
import type {
  CoreBridgeConfig,
  CoreBridgeSessionMessagePayload,
  ServerSession,
  ServerSessionMessage,
  ServerStatusResponse,
} from "./types";

const DEFAULT_CONFIG: CoreBridgeConfig = {
  httpUrl: "http://127.0.0.1:8080",
  wsUrl: "ws://127.0.0.1:8080/api/v1/stream",
};

const RECONNECT_DELAY_MS = 2000;

const globalScope = window as typeof window & {
  __CODEAI_CORE_CONFIG?: CoreBridgeConfig;
};

const resolveConfig = (): CoreBridgeConfig => {
  const config = globalScope.__CODEAI_CORE_CONFIG;
  if (
    !config ||
    typeof config.httpUrl !== "string" ||
    typeof config.wsUrl !== "string"
  ) {
    return DEFAULT_CONFIG;
  }
  return config;
};

const notifyWindow = (message: Record<string, unknown>): void => {
  window.postMessage(message, "*");
};

let initialized = false;
let websocket: WebSocket | null = null;
let reconnectTimer: number | undefined;
let cachedProviders: ProviderStackDescriptor[] = [];
const pendingMessages: string[] = [];

const handleServerMessage = (raw: string): void => {
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
      notifyWindow({
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
      notifyWindow({
        type: "session:created",
        payload: normalized.record,
      });
      break;
    }
    default:
      break;
  }
};

const flushPendingMessages = (): void => {
  if (!websocket || websocket.readyState !== WebSocket.OPEN) {
    return;
  }

  while (pendingMessages.length > 0) {
    const serialized = pendingMessages.shift();
    if (serialized) {
      websocket.send(serialized);
    }
  }
};

const enqueueMessage = (payload: unknown): void => {
  const serialized = JSON.stringify(payload);
  pendingMessages.push(serialized);
  flushPendingMessages();
};

const scheduleReconnect = (config: CoreBridgeConfig): void => {
  if (reconnectTimer) {
    return;
  }
  reconnectTimer = window.setTimeout(() => {
    reconnectTimer = undefined;
    connectWebSocket(config);
  }, RECONNECT_DELAY_MS);
};

const connectWebSocket = (config: CoreBridgeConfig): void => {
  if (websocket) {
    websocket.close();
    websocket = null;
  }

  websocket = new WebSocket(config.wsUrl);
  websocket.addEventListener("open", () => {
    flushPendingMessages();
  });
  websocket.addEventListener("message", (event) => {
    handleServerMessage(String(event.data));
  });
  websocket.addEventListener("close", () => {
    scheduleReconnect(config);
  });
  websocket.addEventListener("error", () => {
    scheduleReconnect(config);
  });
};

const fetchStatusSnapshot = async (config: CoreBridgeConfig): Promise<void> => {
  try {
    const response = await fetch(`${config.httpUrl}/api/v1/status`, {
      method: "GET",
    });
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as ServerStatusResponse;
    const normalized = convertStatusResponse(data, cachedProviders);
    cachedProviders = normalized.providers as ProviderStackDescriptor[];
    notifyWindow({
      type: "core:state",
      payload: normalized,
    });
  } catch {
    // Ignore status fetch failures; the UI will retry when the user interacts.
  }
};

const ensureProvidersAvailable = async (
  config: CoreBridgeConfig
): Promise<readonly ProviderStackDescriptor[]> => {
  if (cachedProviders.length > 0) {
    return cachedProviders;
  }

  await fetchStatusSnapshot(config);
  return cachedProviders;
};

const openProviderPicker = async (): Promise<void> => {
  const config = resolveConfig();
  const providers = await ensureProvidersAvailable(config);

  if (providers.length === 0) {
    notifyWindow({
      type: "ui:providerPickerError",
      payload: { reason: "Core orchestrator is unavailable. Retry shortly." },
    });
    return;
  }

  notifyWindow({
    type: "providerPicker:open",
    payload: { providers },
  });
};

const createSession = (providerIds: readonly ProviderStackId[]): void => {
  const providerId = providerIds[0];
  if (!providerId) {
    notifyWindow({
      type: "ui:providerPickerError",
      payload: { reason: "Select at least one provider to continue." },
    });
    return;
  }

  enqueueMessage({
    type: "session:create",
    payload: { providerId },
  });
};

export const sendChatMessage = (sessionId: string, content: string): void => {
  if (!content.trim()) {
    return;
  }

  enqueueMessage({
    type: "session:message",
    payload: {
      sessionId,
      content,
    },
  });
};

export const handleOutgoingVsCodeMessage = (message: unknown): boolean => {
  if (!message || typeof message !== "object") {
    return false;
  }

  const candidate = message as Record<string, unknown>;

  if (typeof candidate.command === "string") {
    if (candidate.command === "newSession") {
      openProviderPicker().catch((error) => {
        notifyWindow({
          type: "session:error",
          payload: { message: String(error) },
        });
      });
      return true;
    }
    return false;
  }

  if (candidate.type === "providerPicker:confirm") {
    const payload = candidate.payload as
      | { readonly providerIds?: readonly ProviderStackId[] }
      | undefined;
    const providerIds = payload?.providerIds ?? [];
    createSession(providerIds);
    return true;
  }

  return false;
};

export const initializeCoreBridge = (): void => {
  if (initialized || typeof window === "undefined") {
    return;
  }

  initialized = true;
  const config = resolveConfig();
  fetchStatusSnapshot(config).catch((error) => {
    notifyWindow({
      type: "session:error",
      payload: { message: String(error) },
    });
  });
  connectWebSocket(config);
};
