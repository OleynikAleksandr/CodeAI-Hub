import { isCoreStopRequestedByUser } from "./supervisor-requests";
import type { CoreBridgeConfig } from "./types";

type CoreConnectionStatus = "connecting" | "ready" | "error";

interface ScheduleCoreBridgeReconnectOptions {
  readonly config: CoreBridgeConfig;
  readonly connectWebSocket: (config: CoreBridgeConfig) => void;
  readonly hasSuccessfulConnection: boolean;
  readonly notifyConnectionStatus: (
    status: CoreConnectionStatus,
    detail?: string
  ) => void;
  readonly reconnectDelayMs: number;
  readonly reconnectTimerRef: { current: number | undefined };
  readonly requestCoreFromSupervisor: (
    mode: "ensure-started" | "restart" | "stop"
  ) => void;
}

export const scheduleCoreBridgeReconnect = (
  options: ScheduleCoreBridgeReconnectOptions
): void => {
  if (options.reconnectTimerRef.current) {
    return;
  }

  if (isCoreStopRequestedByUser()) {
    options.notifyConnectionStatus(
      "error",
      "Core stopped. Press ▶ or Enter to start it again."
    );
  } else {
    options.notifyConnectionStatus(
      "connecting",
      options.hasSuccessfulConnection
        ? "Reconnecting to CodeAI Hub core…"
        : "Starting CodeAI Hub core via Supervisor…"
    );
    options.requestCoreFromSupervisor(
      options.hasSuccessfulConnection ? "ensure-started" : "restart"
    );
  }

  options.reconnectTimerRef.current = window.setTimeout(() => {
    options.reconnectTimerRef.current = undefined;
    options.connectWebSocket(options.config);
  }, options.reconnectDelayMs);
};
