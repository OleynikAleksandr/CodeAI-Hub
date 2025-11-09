import { Buffer } from "node:buffer";
import http from "node:http";
import net from "node:net";
import type { OutputChannel } from "vscode";
import { buildPortCandidates } from "./core-port-candidates";

const HEALTH_PATH = "/api/v1/health";
const SHUTDOWN_PATH = "/api/v1/shutdown";
const HEALTH_TIMEOUT_MS = 1000;
const SHUTDOWN_TIMEOUT_MS = 2000;
const HTTP_STATUS_OK = 200;
const HTTP_STATUS_ACCEPTED = 202;
const VERSION_MISMATCH_WAIT_MS = 5000;
const VERSION_MISMATCH_POLL_MS = 250;

type CoreHealthPayload = {
  readonly version?: string;
  readonly pid?: number;
};

export type RunningCoreInfo =
  | {
      readonly kind: "match";
      readonly port: number;
      readonly version?: string;
      readonly pid?: number;
    }
  | {
      readonly kind: "mismatch";
      readonly port: number;
      readonly version?: string;
      readonly pid?: number;
    };

export type PortDecision =
  | { readonly kind: "running"; readonly port: number }
  | { readonly kind: "launch"; readonly port: number };

type CorePortManagerOptions = {
  readonly host: string;
  readonly envPort: number;
  readonly channel: OutputChannel;
};

export class CorePortManager {
  private readonly host: string;

  private readonly envPort: number;

  private readonly channel: OutputChannel;

  constructor(options: CorePortManagerOptions) {
    this.host = options.host;
    this.envPort = options.envPort;
    this.channel = options.channel;
  }

  async resolve(
    targetVersion: string | undefined,
    preferredPort?: number
  ): Promise<PortDecision> {
    const candidates = await buildPortCandidates(this.envPort, preferredPort);
    for (const port of candidates) {
      const health = await this.fetchCoreHealth(port);
      if (health) {
        if (this.canReuseCore(health.version, targetVersion)) {
          return { kind: "running", port };
        }
        if (this.shouldRestartCore(health.version, targetVersion)) {
          const stopped = await this.shutdownExistingCore(port, health.pid);
          if (stopped) {
            return { kind: "launch", port };
          }
        }
        continue;
      }
      const available = await this.isPortAvailable(port);
      if (available) {
        return { kind: "launch", port };
      }
    }
    throw new Error(
      "Unable to find an available port for CodeAI Hub core. Close running instances and retry."
    );
  }

  async detectRunning(
    targetVersion: string | undefined,
    preferredPort?: number
  ): Promise<RunningCoreInfo | null> {
    const candidates = await buildPortCandidates(this.envPort, preferredPort);
    for (const port of candidates) {
      const health = await this.fetchCoreHealth(port);
      if (!health) {
        continue;
      }
      if (!targetVersion || health.version === targetVersion) {
        return {
          kind: "match",
          port,
          version: health.version,
          pid: health.pid,
        };
      }
      return {
        kind: "mismatch",
        port,
        version: health.version,
        pid: health.pid,
      };
    }
    return null;
  }

  async stopRunningCore(port: number, pid?: number): Promise<boolean> {
    return await this.shutdownExistingCore(port, pid);
  }

  private async shutdownExistingCore(
    port: number,
    pid?: number
  ): Promise<boolean> {
    this.log(
      `Existing CodeAI Hub core detected on port ${port}. Requesting shutdown...`
    );
    const shutdownRequested = await this.requestCoreShutdown(port);
    if (shutdownRequested) {
      const released = await this.waitForPortRelease(port);
      if (released) {
        this.log("Existing core stopped successfully.");
        return true;
      }
    }

    if (pid && this.forceKillProcess(pid)) {
      this.log(`Forced termination of CodeAI Hub core process ${pid}.`);
      const released = await this.waitForPortRelease(port);
      if (released) {
        return true;
      }
    }

    this.log(
      `Unable to stop CodeAI Hub core on port ${port}. Switching to the next candidate...`
    );
    return false;
  }

  private async requestCoreShutdown(port: number): Promise<boolean> {
    return await new Promise((resolve) => {
      const request = http.request(
        {
          host: this.host,
          port,
          path: SHUTDOWN_PATH,
          method: "POST",
          timeout: SHUTDOWN_TIMEOUT_MS,
        },
        (response) => {
          response.resume();
          resolve(
            response.statusCode === HTTP_STATUS_OK ||
              response.statusCode === HTTP_STATUS_ACCEPTED
          );
        }
      );
      request.on("error", () => resolve(false));
      request.on("timeout", () => {
        request.destroy();
        resolve(false);
      });
      request.end();
    });
  }

  private async waitForPortRelease(port: number): Promise<boolean> {
    const deadline = Date.now() + VERSION_MISMATCH_WAIT_MS;
    while (Date.now() < deadline) {
      const health = await this.fetchCoreHealth(port);
      if (!health) {
        const available = await this.isPortAvailable(port);
        if (available) {
          return true;
        }
      }
      await new Promise((resolve) =>
        setTimeout(resolve, VERSION_MISMATCH_POLL_MS)
      );
    }
    return false;
  }

  private async isPortAvailable(port: number): Promise<boolean> {
    return await new Promise((resolve) => {
      const server = net.createServer();
      const cleanup = (): void => {
        server.removeAllListeners();
      };
      server.once("error", (error) => {
        cleanup();
        const code = (error as NodeJS.ErrnoException).code;
        if (code === "EADDRINUSE") {
          resolve(false);
          return;
        }
        resolve(false);
      });
      server.once("listening", () => {
        server.close(() => {
          cleanup();
          resolve(true);
        });
      });
      server.listen(port, this.host);
    });
  }

  private async fetchCoreHealth(
    port: number
  ): Promise<CoreHealthPayload | null> {
    return await new Promise((resolve) => {
      const request = http.get(
        {
          host: this.host,
          port,
          path: HEALTH_PATH,
          timeout: HEALTH_TIMEOUT_MS,
        },
        (response) => {
          if (response.statusCode !== HTTP_STATUS_OK) {
            response.resume();
            resolve(null);
            return;
          }
          const chunks: Buffer[] = [];
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("end", () => {
            try {
              const payload = JSON.parse(
                Buffer.concat(chunks).toString("utf8")
              ) as CoreHealthPayload;
              resolve(payload);
            } catch {
              resolve(null);
            }
          });
        }
      );
      request.on("error", () => resolve(null));
      request.on("timeout", () => {
        request.destroy();
        resolve(null);
      });
    });
  }

  private forceKillProcess(pid: number): boolean {
    if (pid <= 0) {
      return false;
    }
    try {
      process.kill(pid, "SIGKILL");
      return true;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      this.log(`Failed to terminate process ${pid}: ${reason}.`);
      return false;
    }
  }

  private canReuseCore(
    healthVersion: string | undefined,
    targetVersion?: string
  ): boolean {
    const expectedVersion = targetVersion ?? healthVersion;
    return (
      typeof healthVersion === "string" &&
      typeof expectedVersion === "string" &&
      healthVersion === expectedVersion
    );
  }

  private shouldRestartCore(
    healthVersion: string | undefined,
    targetVersion?: string
  ): boolean {
    const expectedVersion = targetVersion ?? healthVersion;
    return (
      typeof healthVersion === "string" &&
      typeof expectedVersion === "string" &&
      healthVersion !== expectedVersion
    );
  }

  private log(message: string): void {
    this.channel.appendLine(message);
  }
}
