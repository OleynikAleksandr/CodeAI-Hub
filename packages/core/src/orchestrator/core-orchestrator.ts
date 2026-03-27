import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { type CoreConfig, loadConfig } from "../config";
import { FileDropService } from "../file-drop/file-drop-service";
import { ProviderRegistry } from "../provider-registry";
import { type CoreTtlState, RemoteBridge } from "../remote-bridge";
import { ProjectRegistry } from "../services/project-registry/project-registry";
import { SessionManager } from "../session-manager";
import { RuntimeStatusReporter } from "../status/runtime-status-reporter";
import { Logger } from "../telemetry/logger";
import { TemplateSyncFacade } from "../templates/template-sync-facade";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require("../../package.json") as { version: string };

const MILLISECONDS_IN_SECOND = 1000;

export class CoreOrchestrator {
  private readonly config: CoreConfig;

  private readonly logger: Logger;

  private readonly sessionManager: SessionManager;

  private readonly providerRegistry: ProviderRegistry;

  private readonly projectRegistry: ProjectRegistry;

  private readonly remoteBridge: RemoteBridge;

  private readonly statusReporter: RuntimeStatusReporter;

  private readonly fileDropService: FileDropService;

  private readonly templateSync: TemplateSyncFacade;

  private activeClients = 0;

  private shuttingDown = false;

  private idleShutdownTimer: NodeJS.Timeout | null = null;

  private readonly idleTtlMs: number | null;

  private lastActivityAt: Date;

  private idleSince: Date | null = null;

  constructor() {
    this.config = loadConfig();
    this.logger = new Logger();
    this.templateSync = new TemplateSyncFacade(this.logger);
    this.sessionManager = new SessionManager();
    this.statusReporter = new RuntimeStatusReporter();
    this.projectRegistry = new ProjectRegistry();
    this.providerRegistry = new ProviderRegistry({
      config: this.config,
      logger: this.logger,
      statusReporter: this.statusReporter,
    });
    this.fileDropService = new FileDropService();
    this.idleTtlMs =
      this.config.shutdownGracePeriodMs <= 0
        ? null
        : this.config.shutdownGracePeriodMs;
    this.lastActivityAt = new Date();
    this.remoteBridge = new RemoteBridge({
      config: this.config,
      providerRegistry: this.providerRegistry,
      projectRegistry: this.projectRegistry,
      sessionManager: this.sessionManager,
      logger: this.logger,
      version: pkg.version,
      statusReporter: this.statusReporter,
      fileDropService: this.fileDropService,
      hooks: {
        onClientConnected: (_clientId, total) =>
          this.handleClientIncrease(total),
        onClientDisconnected: (_clientId, total) =>
          this.handleClientDecrease(total),
        onShutdownRequested: () => this.requestShutdown("api-request"),
      },
      getTtlState: () => this.buildTtlState(),
    });
  }

  async start(): Promise<void> {
    this.statusReporter.emit({
      phase: "boot",
      scope: "core",
      label: "Initializing the CodeAI Hub core...",
    });

    if (this.config.claudeWorkspacePath) {
      const project = this.projectRegistry.addWorkspace(
        this.config.claudeWorkspacePath
      );
      this.projectRegistry.markLastUsed(project.id);
      this.logger.info("Auto-registered workspace from environment", {
        path: project.path,
        id: project.id,
      });
    }

    await this.templateSync.sync();
    await this.runStartupSelfTest();
    await this.remoteBridge.start();
    await this.providerRegistry.initialize();
    this.statusReporter.emit({
      phase: "finalize",
      scope: "core",
      label: "CodeAI Hub is ready.",
      detail: "You can start a new session.",
    });
    this.logger.info("Core orchestrator started", {
      host: this.config.host,
      port: this.config.port,
    });
  }

  async stop(): Promise<void> {
    this.logger.info("Stopping core orchestrator...");
    await this.remoteBridge.stop();
    this.logger.info("Core orchestrator stopped");
  }

  private handleClientIncrease(total: number): void {
    this.activeClients = total;
    this.lastActivityAt = new Date();
    this.idleSince = null;
    this.logger.info("Client count increased", {
      activeClients: this.activeClients,
    });
    this.clearIdleShutdownTimer();
  }

  private handleClientDecrease(total: number): void {
    this.activeClients = total;
    const now = new Date();
    this.lastActivityAt = now;
    this.logger.info("Client disconnected", {
      activeClients: this.activeClients,
    });

    if (this.activeClients === 0) {
      this.idleSince = now;
      this.scheduleIdleShutdown();
    }
  }

  private requestShutdown(reason: "idle" | "api-request"): void {
    if (this.shuttingDown) {
      return;
    }
    this.shuttingDown = true;
    this.clearIdleShutdownTimer();

    this.logger.info("Shutting down core orchestrator", { reason });
    this.statusReporter.emit({
      phase: "shutdown",
      scope: "core",
      label: "Shutting down CodeAI Hub core...",
      detail:
        reason === "api-request"
          ? "Shutdown requested by manager."
          : "No active clients remain.",
    });
    this.stop()
      .then(() => process.exit(0))
      .catch((error) => {
        this.logger.error("Failed to stop orchestrator", error);
        process.exit(1);
      });
  }

  private async runStartupSelfTest(): Promise<void> {
    this.statusReporter.emit({
      phase: "boot",
      scope: "core",
      label: "Running startup self-test...",
    });
    const sessionsRoot = path.join(
      homedir(),
      ".codeai-hub",
      "sessions",
      this.config.claudeProjectSlug
    );
    try {
      await fs.mkdir(sessionsRoot, { recursive: true });
      this.logger.info("Self-test: session storage ready", {
        path: sessionsRoot,
      });
    } catch (error) {
      this.logger.warn("Self-test failed to ensure session storage directory", {
        error: error instanceof Error ? error.message : String(error),
        path: sessionsRoot,
      });
    }
  }

  private scheduleIdleShutdown(): void {
    if (this.idleShutdownTimer || this.shuttingDown) {
      return;
    }
    if (this.idleTtlMs === null) {
      this.logger.info("Idle shutdown is disabled because TTL is infinite");
      return;
    }
    this.logger.info("Scheduling idle shutdown", {
      delayMs: this.idleTtlMs,
    });
    this.idleShutdownTimer = setTimeout(() => {
      this.idleShutdownTimer = null;
      if (this.activeClients === 0 && !this.shuttingDown) {
        this.requestShutdown("idle");
      }
    }, this.idleTtlMs);
  }

  private clearIdleShutdownTimer(): void {
    if (!this.idleShutdownTimer) {
      return;
    }
    clearTimeout(this.idleShutdownTimer);
    this.idleShutdownTimer = null;
  }

  private buildTtlState(): CoreTtlState {
    const lastActivityAt =
      this.lastActivityAt == null ? null : this.lastActivityAt.toISOString();
    const idleSince = this.idleSince ? this.idleSince.toISOString() : null;

    if (this.idleTtlMs === null) {
      return {
        idleTtlMs: null,
        lastActivityAt,
        idleSince,
        secondsUntilShutdown: null,
      };
    }

    if (!this.idleSince) {
      return {
        idleTtlMs: this.idleTtlMs,
        lastActivityAt,
        idleSince,
        secondsUntilShutdown: null,
      };
    }

    const now = Date.now();
    const elapsedMs = now - this.idleSince.getTime();
    const remainingMs = Math.max(this.idleTtlMs - elapsedMs, 0);
    const secondsUntilShutdown = Math.round(
      remainingMs / MILLISECONDS_IN_SECOND
    );

    return {
      idleTtlMs: this.idleTtlMs,
      lastActivityAt,
      idleSince,
      secondsUntilShutdown,
    };
  }
}
