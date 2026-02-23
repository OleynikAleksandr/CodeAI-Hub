import type {
  ProviderStackDescriptor,
  ProviderStackId,
} from "../../../../types/provider";
import { DEFAULT_CONFIG, FALLBACK_PROVIDERS } from "./constants";
import { scheduleCoreBridgeReconnect } from "./core-bridge-reconnect";
import { convertStatusResponse } from "./normalizers";
import { createServerMessageHandler } from "./server-message-handler";
import {
  resolveSelectedInitiativeSlug,
  resolveSelectedProviderSessionId,
} from "./session-context-resolver";
import { loadSessionHistories } from "./session-history";
import { requestCoreFromSupervisor } from "./supervisor-requests";
import type { CoreBridgeConfig, ServerStatusResponse } from "./types";

const RECONNECT_DELAY_MS = 2000;
const globalScope = window as typeof window & {
  __CODEAI_CORE_CONFIG?: CoreBridgeConfig;
};
type CoreConnectionStatus = "connecting" | "ready" | "error";
type SessionStage = "chat" | "idea" | "spec" | "plan" | "execute";
const COMMAND_STAGE_MAP: Record<string, SessionStage> = {
  startChat: "chat",
  startIdea: "idea",
  startSpec: "spec",
  startPlan: "plan",
  startExecute: "execute",
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
const notifyWindow = (message: Record<string, unknown>): void =>
  window.postMessage(message, "*");
let initialized = false;
let hasSuccessfulConnection = false;
let websocket: WebSocket | null = null;
const reconnectTimerRef: { current: number | undefined } = {
  current: undefined,
};
let cachedProviders: ProviderStackDescriptor[] = [...FALLBACK_PROVIDERS];
const pendingMessages: string[] = [];
let currentConnectionStatus: CoreConnectionStatus | "idle" = "idle";
let currentConnectionDetail: string | undefined;
let pendingStage: SessionStage | null = null;
const notifyConnectionStatus = (
  status: CoreConnectionStatus,
  detail?: string
): void => {
  if (
    currentConnectionStatus === status &&
    currentConnectionDetail === detail
  ) {
    return;
  }
  currentConnectionStatus = status;
  currentConnectionDetail = detail;
  notifyWindow({
    type: "core:connection",
    payload: { status, detail },
  });
};
const handleServerMessage = createServerMessageHandler(notifyWindow);
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
  scheduleCoreBridgeReconnect({
    config,
    connectWebSocket,
    hasSuccessfulConnection,
    notifyConnectionStatus,
    reconnectDelayMs: RECONNECT_DELAY_MS,
    reconnectTimerRef,
    requestCoreFromSupervisor,
  });
};
const connectWebSocket = (config: CoreBridgeConfig): void => {
  if (websocket) {
    websocket.close();
    websocket = null;
  }
  websocket = new WebSocket(config.wsUrl);
  websocket.addEventListener("open", () => {
    hasSuccessfulConnection = true;
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
    scheduleReconnect(config);
  });
  websocket.addEventListener("error", () => {
    if (hasSuccessfulConnection) {
      notifyConnectionStatus(
        "error",
        "Unable to reach CodeAI Hub core. Supervisor will retry automatically."
      );
    } else {
      notifyConnectionStatus(
        "connecting",
        "Waiting for CodeAI Hub core to respond…"
      );
    }
    scheduleReconnect(config);
  });
};
const fetchStatusSnapshot = async (config: CoreBridgeConfig): Promise<void> => {
  try {
    const response = await fetch(`${config.httpUrl}/api/v1/status`, {
      method: "GET",
    });
    if (!response.ok) {
      if (!hasSuccessfulConnection) {
        notifyConnectionStatus(
          "connecting",
          "Waiting for status response from CodeAI Hub core…"
        );
      }
      return;
    }
    const data = (await response.json()) as ServerStatusResponse;
    const normalized = convertStatusResponse(data, cachedProviders);
    cachedProviders = normalized.providers as ProviderStackDescriptor[];
    hasSuccessfulConnection = true;
    notifyConnectionStatus("ready");
    notifyWindow({
      type: "core:state",
      payload: normalized,
    });
    loadSessionHistories(config, normalized.sessions, (payload) => {
      notifyWindow({ type: "session:history", payload });
    }).catch(() => {
      /* Ignore history hydration failures; live stream will populate messages. */
    });
  } catch {
    if (!hasSuccessfulConnection) {
      notifyConnectionStatus(
        "connecting",
        "Waiting for status response from CodeAI Hub core…"
      );
    }
    /* Ignore status fetch failures; the UI will retry when the user interacts. */
  }
};
const ensureProvidersAvailable = async (
  config: CoreBridgeConfig
): Promise<readonly ProviderStackDescriptor[]> => {
  if (cachedProviders.length === 0) {
    await fetchStatusSnapshot(config);
  }
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
  const initiativeSlug = resolveSelectedInitiativeSlug();
  const providerSessionId = resolveSelectedProviderSessionId();
  const stage = pendingStage;
  pendingStage = null;
  enqueueMessage({
    type: "session:create",
    payload: {
      providerId,
      initiativeSlug,
      providerSessionId: providerSessionId ?? undefined,
      stage,
    },
  });
};
export const sendChatMessage = (
  sessionId: string,
  content: string,
  turnOptions?: Record<string, unknown>
): void => {
  if (!content.trim()) {
    return;
  }
  const messageContent = turnOptions ? { text: content, turnOptions } : content;
  enqueueMessage({
    type: "session:message",
    payload: {
      sessionId,
      content: messageContent,
    },
  });
};
export const deleteSession = (sessionId: string): void => {
  enqueueMessage({
    type: "session:delete",
    payload: {
      sessionId,
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
    pendingStage = COMMAND_STAGE_MAP[candidate.command] ?? pendingStage;
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
  if (candidate.type === "providerPicker:cancel") {
    pendingStage = null;
    return false;
  }
  return false;
};
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
