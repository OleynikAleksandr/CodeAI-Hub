import { window } from "vscode";
import WebSocket from "ws";
import type {
  CoreConnectionInfo,
  CoreProcessManager,
} from "./core-process-manager";

const RECONNECT_DELAY_MS = 2000;

export class CoreKeepAlive {
  private readonly manager: CoreProcessManager;

  private readonly channel = window.createOutputChannel("CodeAI Hub KeepAlive");

  private socket: WebSocket | null = null;

  private reconnectTimer: NodeJS.Timeout | undefined;

  private disposed = false;

  private started = false;

  private connectionInfo: CoreConnectionInfo | null = null;

  private unsubscribeConnectionChange?: () => void;

  private unsubscribeProcessExit?: () => void;

  private pendingEnsure: Promise<void> | null = null;

  constructor(manager: CoreProcessManager) {
    this.manager = manager;
  }

  start(): void {
    if (this.started || this.disposed) {
      return;
    }

    this.started = true;
    this.unsubscribeConnectionChange = this.manager.onConnectionInfoChange(
      (info) => {
        this.connectionInfo = info;
        this.log(`Core connection info updated: ${info.wsUrl}`);
        this.scheduleReconnect(true);
      }
    );
    this.unsubscribeProcessExit = this.manager.onProcessExit(() => {
      this.log("Core process exited. Scheduling restart.");
      this.scheduleReconnect(true);
    });

    this.connectionInfo = this.manager.getConnectionInfo();
    this.scheduleReconnect(true);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.unsubscribeConnectionChange?.();
    this.unsubscribeProcessExit?.();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.cleanupSocket();
    this.channel.dispose();
  }

  private scheduleReconnect(immediate = false): void {
    if (!this.started || this.disposed) {
      return;
    }

    if (this.reconnectTimer) {
      if (!immediate) {
        return;
      }
      clearTimeout(this.reconnectTimer);
    }

    const delay = immediate ? 0 : RECONNECT_DELAY_MS;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connect().catch(() => {
        /* error already logged inside connect */
      });
    }, delay);
  }

  private async connect(): Promise<void> {
    if (this.disposed || !this.connectionInfo) {
      return;
    }

    await this.ensureCoreAvailable();
    this.cleanupSocket();
    if (this.disposed) {
      return;
    }

    try {
      this.log(`Opening keepalive connection ${this.connectionInfo.wsUrl}`);
      this.socket = new WebSocket(this.connectionInfo.wsUrl);
    } catch (error) {
      this.log(
        `Failed to initialize keepalive socket: ${this.describeError(error)}`
      );
      this.scheduleReconnect();
      return;
    }

    this.socket.on("open", () => {
      this.log("Keepalive connection established.");
    });

    this.socket.on("close", () => {
      this.log("Keepalive connection closed.");
      this.scheduleReconnect();
    });

    this.socket.on("error", (error) => {
      this.log(`Keepalive connection error: ${this.describeError(error)}`);
    });
  }

  private async ensureCoreAvailable(): Promise<void> {
    if (!this.pendingEnsure) {
      this.pendingEnsure = this.manager
        .ensureStarted()
        .catch((error) => {
          this.log(
            `Failed to ensure core availability: ${this.describeError(error)}`
          );
        })
        .finally(() => {
          this.pendingEnsure = null;
        });
    }

    const pending = this.pendingEnsure;
    if (pending) {
      await pending;
    }
  }

  private cleanupSocket(): void {
    if (!this.socket) {
      return;
    }

    try {
      this.socket.terminate();
    } catch {
      /* ignore termination failures */
    }
    this.socket.removeAllListeners();
    this.socket = null;
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  private log(message: string): void {
    this.channel.appendLine(`[KeepAlive] ${message}`);
  }
}
