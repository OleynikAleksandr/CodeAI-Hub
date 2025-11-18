import type { ProviderStackDescriptor } from "../../../../types/provider";
import { logUiDiagnostic } from "../diagnostics/log";
import { FALLBACK_PROVIDERS } from "./fallback-providers";
import { createHistoryHydrator } from "./history-hydrator";
import { convertStatusResponse } from "./normalizers";
import { createProviderRuntimeActions } from "./provider-runtime-actions";
import { createServerMessageHandler } from "./server-message-handler";
import type {
  CoreBridgeConfig,
  CoreBridgeStatePayload,
  ServerStatusResponse,
} from "./types";
import { createCoreBridgeUiActions } from "./ui-actions";

const DEFAULT_CONFIG: CoreBridgeConfig = {
  httpUrl: "http://127.0.0.1:8080",
  wsUrl: "ws://127.0.0.1:8080/api/v1/stream",
};

const RECONNECT_DELAY_MS = 2000;
const STATUS_SNAPSHOT_RETRY_LIMIT = 3;
const STATUS_SNAPSHOT_RETRY_DELAY_MS = 1500;
const globalScope = window as typeof window & {
  __CODEAI_CORE_CONFIG?: CoreBridgeConfig;
};

const delay = (durationMs: number): Promise<void> =>
  new Promise((resolve) => {
    window.setTimeout(resolve, durationMs);
  });

type CoreConnectionStatus = "connecting" | "ready" | "error";

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
let hasSuccessfulConnection = false;
let websocket: WebSocket | null = null;
let reconnectTimer: number | undefined;
let cachedProviders: ProviderStackDescriptor[] = [...FALLBACK_PROVIDERS];
const pendingMessages: string[] = [];
let currentConnectionStatus: CoreConnectionStatus | "idle" = "idle";

const notifyConnectionStatus = (status: CoreConnectionStatus): void => {
  if (currentConnectionStatus === status) {
    return;
  }
  currentConnectionStatus = status;
  notifyWindow({
    type: "core:connection",
    payload: { status },
  });
};

const historyHydrator = createHistoryHydrator(notifyWindow);

const normalizeCoreStateFromWebsocket = (
  payload: unknown
): CoreBridgeStatePayload | null => {
  const config = resolveConfig();
  const candidate =
    payload && typeof payload === "object"
      ? (payload as ServerStatusResponse)
      : ({} as ServerStatusResponse);
  const normalized = convertStatusResponse(candidate, cachedProviders);
  cachedProviders = normalized.providers.slice();
  hasSuccessfulConnection = true;
  notifyConnectionStatus("ready");
  logUiDiagnostic(
    `[CoreBridge] WebSocket snapshot received (sessions=${normalized.sessions.length}, providers=${cachedProviders.length}).`
  );
  historyHydrator.hydrate(config, normalized.sessions);
  return normalized;
};

const handleServerMessage = createServerMessageHandler(
  notifyWindow,
  normalizeCoreStateFromWebsocket
);
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
const runtimeActions = createProviderRuntimeActions(enqueueMessage);
const scheduleReconnect = (config: CoreBridgeConfig): void => {
  if (reconnectTimer) {
    return;
  }
  logUiDiagnostic("[CoreBridge] Scheduling reconnect to core WebSocket.");
  notifyConnectionStatus("connecting");
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
    hasSuccessfulConnection = true;
    logUiDiagnostic("[CoreBridge] WebSocket connection established.");
    notifyConnectionStatus("ready");
    fetchStatusSnapshot(config).catch(() => {
      /* ignore, we'll retry on demand */
    });
    flushPendingMessages();
  });
  websocket.addEventListener("message", (event) => {
    handleServerMessage(String(event.data));
  });
  websocket.addEventListener("close", () => {
    historyHydrator.markStale();
    logUiDiagnostic("[CoreBridge] WebSocket closed. Scheduling reconnect...");
    scheduleReconnect(config);
  });
  websocket.addEventListener("error", () => {
    historyHydrator.markStale();
    if (hasSuccessfulConnection) {
      notifyConnectionStatus("error");
    } else {
      notifyConnectionStatus("connecting");
    }
    scheduleReconnect(config);
  });
};
const fetchStatusSnapshot = async (
  config: CoreBridgeConfig,
  attempt = 1
): Promise<void> => {
  try {
    logUiDiagnostic(
      `[CoreBridge] Fetching status snapshot (attempt ${attempt}/${STATUS_SNAPSHOT_RETRY_LIMIT}).`
    );
    const response = await fetch(`${config.httpUrl}/api/v1/status`, {
      method: "GET",
    });
    if (!response.ok) {
      throw new Error(
        `Snapshot request failed (${response.status} ${response.statusText})`
      );
    }
    const data = (await response.json()) as ServerStatusResponse;
    const normalized = convertStatusResponse(data, cachedProviders);
    cachedProviders = normalized.providers.slice();
    hasSuccessfulConnection = true;
    notifyConnectionStatus("ready");
    logUiDiagnostic(
      `[CoreBridge] Status snapshot received (sessions=${normalized.sessions.length}, providers=${cachedProviders.length}).`
    );
    notifyWindow({
      type: "core:state",
      payload: normalized,
    });
    historyHydrator.hydrate(config, normalized.sessions, { force: true });
    historyHydrator.reset();
  } catch (error) {
    historyHydrator.markStale();
    const reason = error instanceof Error ? error.message : String(error);
    logUiDiagnostic(
      `[CoreBridge] Failed to fetch status snapshot from ${config.httpUrl}/api/v1/status (attempt ${attempt}/${STATUS_SNAPSHOT_RETRY_LIMIT}): ${reason}`
    );
    if (!hasSuccessfulConnection) {
      notifyConnectionStatus("connecting");
    }
    if (attempt < STATUS_SNAPSHOT_RETRY_LIMIT) {
      await delay(STATUS_SNAPSHOT_RETRY_DELAY_MS);
      await fetchStatusSnapshot(config, attempt + 1);
      return;
    }
    /* Ignore final status fetch failures; the UI will retry when the user interacts. */
  }
};

const uiActions = createCoreBridgeUiActions({
  notifyWindow,
  resolveConfig,
  getCachedProviders: () => cachedProviders,
  fetchStatusSnapshot,
  enqueueMessage,
  runtimeActions,
});

export const sendChatMessage = uiActions.sendChatMessage;
export const deleteSession = uiActions.deleteSession;
export const refreshProviderVersions = uiActions.refreshProviderVersions;
export const installProviderVendorRuntime =
  uiActions.installProviderVendorRuntime;
export const restoreProviderRuntime = uiActions.restoreProviderRuntime;
export const requestStatusSnapshot = uiActions.requestStatusSnapshot;
export const handleOutgoingVsCodeMessage =
  uiActions.handleOutgoingVsCodeMessage;
export const initializeCoreBridge = (): void => {
  if (initialized || typeof window === "undefined") {
    return;
  }

  initialized = true;
  notifyConnectionStatus("connecting");
  const config = resolveConfig();
  fetchStatusSnapshot(config).catch((error) => {
    if (hasSuccessfulConnection) {
      notifyConnectionStatus("error");
    }
    notifyWindow({
      type: "session:error",
      payload: { message: String(error) },
    });
  });
  connectWebSocket(config);
};
