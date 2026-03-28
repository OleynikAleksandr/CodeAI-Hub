import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readHealth } from "@codeai-hub/core-supervisor";
import { window } from "vscode";
import WebSocket from "ws";
import type { CoreConnectionInfo } from "./core-connection-info";
import type { CoreProcessManager } from "./core-process-manager";

const RECONNECT_DELAY_MS = 2000;
const OBSERVER_LOG_PATH = path.join(
  os.homedir(),
  ".codeai-hub",
  "logs",
  "observer",
  "bridge-observer.log"
);

const appendObserverLog = (
  event: string,
  payload?: Record<string, unknown>
): void => {
  try {
    fs.mkdirSync(path.dirname(OBSERVER_LOG_PATH), { recursive: true });
    fs.appendFileSync(
      OBSERVER_LOG_PATH,
      `${JSON.stringify({
        timestamp: new Date().toISOString(),
        event,
        ...(payload ?? {}),
      })}\n`,
      "utf8"
    );
  } catch {
    // Ignore observer log write failures to avoid impacting keepalive.
  }
};

export class CoreKeepAlive {
  private readonly manager: CoreProcessManager;

  private readonly channel = window.createOutputChannel("CodeAI Hub KeepAlive");

  private socket: WebSocket | null = null;

  private reconnectTimer: NodeJS.Timeout | undefined;

  private disposed = false;

  private started = false;

  private connectionInfo: CoreConnectionInfo | null = null;

  private unsubscribeConnectionChange?: () => void;

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
    this.connectionInfo = this.manager.getConnectionInfo();
    this.scheduleReconnect(true);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.unsubscribeConnectionChange?.();
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
      await this.reportSupervisorStatus();
      this.scheduleReconnect();
      return;
    }

    this.socket.on("open", () => {
      this.log("Keepalive connection established.");
    });

    this.socket.on("close", () => {
      this.log("Keepalive connection closed.");
      this.reportSupervisorStatus().catch(() => {
        /* status logging already handled inside reportSupervisorStatus */
      });
      this.scheduleReconnect();
    });

    this.socket.on("error", (error) => {
      this.log(`Keepalive connection error: ${this.describeError(error)}`);
    });
  }

  private async reportSupervisorStatus(): Promise<void> {
    const options = this.resolveConnectionOptions();
    if (!options) {
      return;
    }
    try {
      const health = await readHealth(options);
      if (health?.status === "ok") {
        this.log(
          `[Supervisor] Core reachable (pid ${
            health.pid ?? "unknown"
          }, version ${health.version ?? "unknown"}).`
        );
      } else {
        this.log(
          `[Supervisor] Core is not reachable at http://${options.host}:${options.port}.`
        );
      }
    } catch (error) {
      this.log(
        `[Supervisor] Status check failed: ${this.describeError(error)}`
      );
    }
  }

  private resolveConnectionOptions(): { host: string; port: number } | null {
    const info = this.connectionInfo;
    if (!info) {
      return null;
    }
    try {
      const url = new URL(info.httpUrl);
      const port = Number.parseInt(url.port, 10);
      if (!Number.isFinite(port) || port <= 0) {
        return null;
      }
      return {
        host: url.hostname,
        port,
      };
    } catch {
      return null;
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
    appendObserverLog("keepalive:message", { message });
  }
}
