import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { type CoreConfig, loadConfig } from "../config";
import { FileDropService } from "../file-drop/file-drop-service";
import { ProviderRegistry } from "../provider-registry";
import { RemoteBridge } from "../remote-bridge";
import { SessionManager } from "../session-manager";
import { RuntimeStatusReporter } from "../status/runtime-status-reporter";
import { Logger } from "../telemetry/logger";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require("../../package.json") as { version: string };

export class CoreOrchestrator {
  private readonly config: CoreConfig;

  private readonly logger: Logger;

  private readonly sessionManager: SessionManager;

  private readonly providerRegistry: ProviderRegistry;

  private readonly remoteBridge: RemoteBridge;

  private readonly statusReporter: RuntimeStatusReporter;

  private readonly fileDropService: FileDropService;

  private activeClients = 0;

  private shuttingDown = false;

  constructor() {
    this.config = loadConfig();
    this.logger = new Logger();
    this.sessionManager = new SessionManager();
    this.statusReporter = new RuntimeStatusReporter();
    this.providerRegistry = new ProviderRegistry({
      config: this.config,
      logger: this.logger,
      statusReporter: this.statusReporter,
    });
    this.fileDropService = new FileDropService();
    this.remoteBridge = new RemoteBridge({
      config: this.config,
      providerRegistry: this.providerRegistry,
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
      },
    });
  }

  async start(): Promise<void> {
    this.statusReporter.emit({
      phase: "boot",
      scope: "core",
      label: "Initializing the CodeAI Hub core...",
    });
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
    this.logger.info("Client count increased", {
      activeClients: this.activeClients,
    });
  }

  private handleClientDecrease(total: number): void {
    this.activeClients = total;
    this.logger.info("Client disconnected", {
      activeClients: this.activeClients,
    });

    if (this.activeClients === 0) {
      this.shutdownNow();
    }
  }

  private shutdownNow(): void {
    if (this.shuttingDown) {
      return;
    }
    this.shuttingDown = true;

    this.logger.info("No active clients, shutting down core immediately");
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
}
