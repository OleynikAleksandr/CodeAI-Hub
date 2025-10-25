import pkg from "../../package.json" with { type: "json" };
import { type CoreConfig, loadConfig } from "../config";
import { ProviderRegistry } from "../provider-registry";
import { RemoteBridge } from "../remote-bridge";
import { SessionManager } from "../session-manager";
import { Logger } from "../telemetry/logger";

export class CoreOrchestrator {
  private readonly config: CoreConfig;

  private readonly logger: Logger;

  private readonly sessionManager: SessionManager;

  private readonly providerRegistry: ProviderRegistry;

  private readonly remoteBridge: RemoteBridge;

  private activeClients = 0;

  private shutdownTimer?: NodeJS.Timeout;

  constructor() {
    this.config = loadConfig();
    this.logger = new Logger();
    this.sessionManager = new SessionManager();
    this.providerRegistry = new ProviderRegistry();
    this.remoteBridge = new RemoteBridge({
      config: this.config,
      providerRegistry: this.providerRegistry,
      sessionManager: this.sessionManager,
      logger: this.logger,
      version: pkg.version,
      hooks: {
        onClientConnected: (_clientId, total) =>
          this.handleClientIncrease(total),
        onClientDisconnected: (_clientId, total) =>
          this.handleClientDecrease(total),
      },
    });
  }

  async start(): Promise<void> {
    await this.remoteBridge.start();
    this.logger.info("Core orchestrator started", {
      host: this.config.host,
      port: this.config.port,
    });
  }

  async stop(): Promise<void> {
    this.logger.info("Stopping core orchestrator...");
    if (this.shutdownTimer) {
      clearTimeout(this.shutdownTimer);
      this.shutdownTimer = undefined;
    }

    await this.remoteBridge.stop();
    this.logger.info("Core orchestrator stopped");
  }

  private handleClientIncrease(total: number): void {
    this.activeClients = total;
    if (this.shutdownTimer) {
      clearTimeout(this.shutdownTimer);
      this.shutdownTimer = undefined;
      this.logger.info("Shutdown timer cancelled - clients reconnected", {
        activeClients: this.activeClients,
      });
    } else {
      this.logger.info("Client count increased", {
        activeClients: this.activeClients,
      });
    }
  }

  private handleClientDecrease(total: number): void {
    this.activeClients = total;
    this.logger.info("Client disconnected", {
      activeClients: this.activeClients,
    });

    if (this.activeClients > 0) {
      return;
    }

    this.scheduleShutdown();
  }

  private scheduleShutdown(): void {
    if (this.shutdownTimer) {
      return;
    }

    this.logger.info("No active clients, scheduling shutdown", {
      delayMs: this.config.shutdownGracePeriodMs,
    });
    this.shutdownTimer = setTimeout(() => {
      this.shutdownTimer = undefined;
      this.logger.info("Grace period elapsed, shutting down");
      this.stop()
        .then(() => process.exit(0))
        .catch((error) => {
          this.logger.error("Failed to stop orchestrator", error);
          process.exit(1);
        });
    }, this.config.shutdownGracePeriodMs);
  }
}
