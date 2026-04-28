import type {
  IncomingMessage,
  SettingsLocalizationSyncStatusPayload,
} from "../core-stream-message-types";

const RECONNECT_BASE_DELAY_MS = 2000;
const RECONNECT_MAX_DELAY_MS = 30_000;

interface ProjectManagerWindowMessageHandlerOptions {
  readonly addProject: (path: string) => void;
  readonly notifyCoreListeners: (message: IncomingMessage) => void;
  readonly setLocalizationSyncStatus: (
    payload: SettingsLocalizationSyncStatusPayload
  ) => void;
}

interface ProjectManagerSocketLifecycleOptions {
  readonly onClose: () => void;
  readonly onError: (error: Event) => void;
  readonly onMessage: (data: string) => void;
  readonly onOpen: () => void;
  readonly streamUrl: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseLocalizationPayload = (
  message: Record<string, unknown>
): SettingsLocalizationSyncStatusPayload | null => {
  if (typeof message.busy !== "boolean") {
    return null;
  }
  return {
    busy: message.busy,
    message: typeof message.message === "string" ? message.message : null,
  };
};

export class ProjectManagerSocketLifecycle {
  private intentionalDisconnect = false;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private socket: WebSocket | null = null;

  constructor(private readonly options: ProjectManagerSocketLifecycleOptions) {}

  connect(): void {
    if (
      this.socket?.readyState === WebSocket.OPEN ||
      this.socket?.readyState === WebSocket.CONNECTING
    ) {
      return;
    }

    this.clearReconnectTimer();
    this.intentionalDisconnect = false;
    try {
      const socket = new WebSocket(this.options.streamUrl);
      this.socket = socket;
      socket.onopen = () => this.handleOpen(socket);
      socket.onmessage = (event) => this.handleMessage(socket, event);
      socket.onclose = () => this.handleClose(socket);
      socket.onerror = (error) => this.handleError(socket, error);
    } catch {
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.intentionalDisconnect = true;
    this.clearReconnectTimer();
    const socket = this.socket;
    this.socket = null;
    if (!socket) {
      return;
    }
    socket.onopen = null;
    socket.onmessage = null;
    socket.onclose = null;
    socket.onerror = null;
    if (
      socket.readyState === WebSocket.CONNECTING ||
      socket.readyState === WebSocket.OPEN
    ) {
      socket.close();
    }
  }

  send(serialized: string): boolean {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      return false;
    }
    this.socket.send(serialized);
    return true;
  }

  private clearReconnectTimer(): void {
    if (!this.reconnectTimer) {
      return;
    }
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
  }

  private handleClose(socket: WebSocket): void {
    if (!this.isCurrentSocket(socket)) {
      return;
    }
    this.socket = null;
    this.options.onClose();
    if (!this.intentionalDisconnect) {
      this.scheduleReconnect();
    }
  }

  private handleError(socket: WebSocket, error: Event): void {
    if (!this.isCurrentSocket(socket)) {
      return;
    }
    this.options.onError(error);
    if (!this.intentionalDisconnect) {
      this.scheduleReconnect();
    }
  }

  private handleMessage(socket: WebSocket, event: MessageEvent): void {
    if (this.isCurrentSocket(socket)) {
      this.options.onMessage(String(event.data));
    }
  }

  private handleOpen(socket: WebSocket): void {
    if (!this.isCurrentSocket(socket)) {
      socket.close();
      return;
    }
    this.reconnectAttempt = 0;
    this.options.onOpen();
  }

  private isCurrentSocket(socket: WebSocket): boolean {
    return this.socket === socket;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    const delayMs = Math.min(
      RECONNECT_BASE_DELAY_MS * 2 ** this.reconnectAttempt,
      RECONNECT_MAX_DELAY_MS
    );
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delayMs);
  }
}

export const createProjectManagerWindowMessageHandler = (
  options: ProjectManagerWindowMessageHandlerOptions
): ((event: MessageEvent) => void) => {
  return (event: MessageEvent): void => {
    const message = event.data;
    if (!isRecord(message) || typeof message.type !== "string") {
      return;
    }

    if (message.type === "settings:localization-sync-status") {
      const payload = parseLocalizationPayload(message);
      if (!payload) {
        return;
      }
      options.setLocalizationSyncStatus(payload);
      options.notifyCoreListeners({
        type: "settings:localization-sync-status",
        payload,
      });
      return;
    }

    if (message.type !== "projects:folderPicked") {
      return;
    }
    const payload = isRecord(message.payload) ? message.payload : null;
    const path = typeof payload?.path === "string" ? payload.path : null;
    if (!path) {
      return;
    }
    window.dispatchEvent(
      new CustomEvent("pm:workspace:add-requested", { detail: { path } })
    );
    options.addProject(path);
  };
};
