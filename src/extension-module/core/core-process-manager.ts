import type { SupervisorLogger } from "@codeai-hub/core-supervisor";
import {
  startCore as supervisorStartCore,
  stopCore as supervisorStopCore,
} from "@codeai-hub/core-supervisor";
import { window } from "vscode";
import { getExtensionLogger } from "../logging/extension-logger";
import {
  CORE_HOST,
  type CoreConnectionInfo,
  createConnectionUrls,
  DEFAULT_CORE_PORT,
  ENV_CORE_PORT,
} from "./core-connection-info";
import type { CoreRuntimeInfo } from "./core-installer";
import { CorePortManager, type RunningCoreInfo } from "./core-port-manager";
import { notifyConnectionListeners } from "./core-process-notifiers";

const SUPERVISOR_LOG_TRIM_PATTERN = /\s+$/u;

interface EnsureStartedOptions {
  readonly forceRestart?: boolean;
  readonly targetVersion?: string;
}

interface RestartCoreOptions {
  readonly onProgress?: (payload: RestartProgressPayload) => void;
  readonly stopStartDelayMs?: number;
  readonly targetVersion?: string;
}

export interface RestartProgressPayload {
  readonly busy: boolean;
  readonly message: string;
  readonly phase: "stopping" | "waiting" | "starting" | "ready";
}

const DEFAULT_RESTART_DELAY_MS = 3000;
export class CoreProcessManager {
  private declaredVersion?: string;
  private readonly channel = window.createOutputChannel("CodeAI Hub Core");
  private readonly host = CORE_HOST;
  private readonly envPort: number;
  private currentPort: number;
  private connectionInfo: CoreConnectionInfo;
  private readonly portManager: CorePortManager;
  private readonly connectionListeners = new Set<
    (info: CoreConnectionInfo) => void
  >();
  private readonly extensionLogger = getExtensionLogger();
  private readonly supervisorLogger: SupervisorLogger;
  constructor() {
    this.envPort = Number.isFinite(ENV_CORE_PORT)
      ? ENV_CORE_PORT
      : DEFAULT_CORE_PORT;
    this.currentPort = this.envPort;
    this.connectionInfo = createConnectionUrls(this.currentPort, this.host);
    this.portManager = new CorePortManager({
      host: this.host,
      envPort: this.envPort,
    });
    this.supervisorLogger = {
      info: (message: string) => {
        this.channel.appendLine(this.normalizeSupervisorMessage(message));
      },
      error: (message: string) => {
        this.channel.appendLine(this.normalizeSupervisorMessage(message));
      },
    };
  }
  async ensureStarted(
    runtimeInfo?: CoreRuntimeInfo,
    options?: EnsureStartedOptions
  ): Promise<void> {
    const declaredVersionCandidate =
      options?.targetVersion ?? this.declaredVersion ?? runtimeInfo?.version;
    if (declaredVersionCandidate) {
      this.declaredVersion = declaredVersionCandidate;
    }

    const targetVersion = this.declaredVersion;
    if (!options?.forceRestart) {
      const attached = await this.tryAttachToRunningCore(targetVersion);
      if (attached) {
        return;
      }
    }

    const decision = await this.portManager.resolve(
      targetVersion,
      this.currentPort
    );
    this.updateConnectionInfo(decision.port);

    if (decision.kind === "running") {
      if (options?.forceRestart) {
        await this.restartViaSupervisor(decision.port, targetVersion);
        return;
      }
      this.channel.appendLine("CodeAI Hub core already running.");
      return;
    }

    await this.startViaSupervisor(decision.port, targetVersion);
    const attached = await this.tryAttachToRunningCore(targetVersion);
    if (!attached) {
      throw new Error(
        "Core supervisor reported ready, but no running core instance was detected."
      );
    }
  }

  async stop(): Promise<void> {
    const running = await this.portManager.detectRunning(
      undefined,
      this.currentPort
    );
    if (!running) {
      this.channel.appendLine("CodeAI Hub core is already stopped.");
      return;
    }

    this.updateConnectionInfo(running.port);
    await this.stopViaSupervisor(running.port);
  }

  async restartWithFeedback(options?: RestartCoreOptions): Promise<void> {
    const declaredVersionCandidate =
      options?.targetVersion ?? this.declaredVersion;
    if (declaredVersionCandidate) {
      this.declaredVersion = declaredVersionCandidate;
    }

    const targetVersion = this.declaredVersion;
    const running = await this.portManager.detectRunning(
      undefined,
      this.currentPort
    );

    if (running) {
      this.updateConnectionInfo(running.port);
      options?.onProgress?.({
        phase: "stopping",
        message: "Stopping core...",
        busy: true,
      });
      await this.stopViaSupervisor(running.port);
      options?.onProgress?.({
        phase: "waiting",
        message: this.buildRestartWaitMessage(
          options?.stopStartDelayMs ?? DEFAULT_RESTART_DELAY_MS
        ),
        busy: true,
      });
    } else {
      options?.onProgress?.({
        phase: "waiting",
        message: this.buildFreshStartWaitMessage(
          options?.stopStartDelayMs ?? DEFAULT_RESTART_DELAY_MS
        ),
        busy: true,
      });
    }

    await this.wait(options?.stopStartDelayMs ?? DEFAULT_RESTART_DELAY_MS);

    const decision = await this.portManager.resolve(
      targetVersion,
      this.currentPort
    );
    this.updateConnectionInfo(decision.port);

    options?.onProgress?.({
      phase: "starting",
      message: "Starting core...",
      busy: true,
    });

    if (decision.kind !== "running") {
      await this.startViaSupervisor(decision.port, targetVersion);
    }

    const attached = await this.tryAttachToRunningCore(targetVersion);
    if (!attached) {
      throw new Error(
        "Core restart sequence finished, but the health endpoint is still unavailable."
      );
    }

    options?.onProgress?.({
      phase: "ready",
      message: running
        ? "Core was stopped and started again successfully."
        : "Core started successfully.",
      busy: false,
    });
  }

  setDeclaredVersion(version: string): void {
    this.declaredVersion = version;
  }
  attachToRunningCore(targetVersion?: string): Promise<boolean> {
    const version = targetVersion ?? this.declaredVersion;
    if (version) {
      this.declaredVersion = version;
    }
    return this.tryAttachToRunningCore(version);
  }
  getConnectionInfo(): CoreConnectionInfo {
    return this.connectionInfo;
  }
  onConnectionInfoChange(
    listener: (info: CoreConnectionInfo) => void
  ): () => void {
    this.connectionListeners.add(listener);
    listener(this.connectionInfo);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }
  private updateConnectionInfo(port: number): void {
    if (this.currentPort === port) {
      return;
    }
    this.currentPort = port;
    this.connectionInfo = createConnectionUrls(port, this.host);
    notifyConnectionListeners(
      this.connectionListeners,
      this.connectionInfo,
      this.channel
    );
  }
  private async tryAttachToRunningCore(
    targetVersion?: string
  ): Promise<boolean> {
    const running = await this.detectRunningCore(targetVersion);
    if (!running) {
      return false;
    }
    if (running.kind === "match") {
      this.channel.appendLine("CodeAI Hub core already running.");
      return true;
    }
    await this.handleDetectedMismatch(running);
    return false;
  }
  private async detectRunningCore(
    targetVersion?: string
  ): Promise<RunningCoreInfo | null> {
    const running = await this.portManager.detectRunning(
      targetVersion,
      this.currentPort
    );
    if (running?.kind === "match") {
      this.updateConnectionInfo(running.port);
    }
    return running;
  }
  private async handleDetectedMismatch(
    running: RunningCoreInfo
  ): Promise<void> {
    this.channel.appendLine(
      `Detected outdated CodeAI Hub core (version ${running.version ?? "unknown"}) on port ${running.port}. Requesting shutdown...`
    );
    try {
      await this.stopViaSupervisor(running.port);
      this.channel.appendLine("Outdated core stopped successfully.");
    } catch {
      this.channel.appendLine(
        "Unable to stop outdated core automatically. Falling back to new port."
      );
    }
  }

  private async startViaSupervisor(
    port: number,
    targetVersion?: string
  ): Promise<void> {
    this.logSupervisorEvent("core-manager:supervisor:start:request", {
      port,
      targetVersion: targetVersion ?? null,
    });
    try {
      await supervisorStartCore(
        {
          host: this.host,
          port,
        },
        this.supervisorLogger
      );
      this.logSupervisorEvent("core-manager:supervisor:start:success", {
        port,
        targetVersion: targetVersion ?? null,
      });
    } catch (error) {
      this.logSupervisorEvent(
        "core-manager:supervisor:start:error",
        {
          port,
          targetVersion: targetVersion ?? null,
          reason: this.describeError(error),
        },
        "error"
      );
      throw error;
    }
  }

  private async stopViaSupervisor(port: number): Promise<void> {
    this.logSupervisorEvent("core-manager:supervisor:stop:request", { port });
    try {
      await supervisorStopCore(
        {
          host: this.host,
          port,
        },
        this.supervisorLogger
      );
      this.logSupervisorEvent("core-manager:supervisor:stop:success", {
        port,
      });
    } catch (error) {
      this.logSupervisorEvent(
        "core-manager:supervisor:stop:error",
        {
          port,
          reason: this.describeError(error),
        },
        "error"
      );
      throw error;
    }
  }

  private async restartViaSupervisor(
    port: number,
    targetVersion?: string
  ): Promise<void> {
    await this.stopViaSupervisor(port);
    await this.startViaSupervisor(port, targetVersion);
  }

  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  private buildRestartWaitMessage(delayMs: number): string {
    const seconds = Math.max(1, Math.round(delayMs / 1000));
    return `Core stopped. Waiting ${seconds}s before restart...`;
  }

  private buildFreshStartWaitMessage(delayMs: number): string {
    const seconds = Math.max(1, Math.round(delayMs / 1000));
    return `Core is not running. Starting in ${seconds}s...`;
  }

  private logSupervisorEvent(
    event: string,
    payload?: Record<string, unknown>,
    level: "info" | "warn" | "error" | "debug" = "info"
  ): void {
    const entry = {
      host: this.host,
      currentPort: this.currentPort,
      ...payload,
    };
    switch (level) {
      case "error":
        this.extensionLogger.error(event, entry);
        return;
      case "warn":
        this.extensionLogger.warn(event, entry);
        return;
      case "debug":
        this.extensionLogger.debug(event, entry);
        return;
      default:
        this.extensionLogger.info(event, entry);
        return;
    }
  }

  private normalizeSupervisorMessage(message: string): string {
    return message.replace(SUPERVISOR_LOG_TRIM_PATTERN, "");
  }

  private describeError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }

  dispose(): void {
    this.channel.dispose();
  }
}
