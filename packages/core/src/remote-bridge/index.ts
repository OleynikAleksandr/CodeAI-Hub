import type { WebSocket } from "ws";
import type { CoreConfig } from "../config";
import type { FileDropService } from "../file-drop/file-drop-service";
import type { ProviderRegistry } from "../provider-registry";
import type { ProjectRegistry } from "../services/project-registry/project-registry";
import type { SessionManager } from "../session-manager";
import type {
  RuntimeStatusEvent,
  RuntimeStatusReporter,
} from "../status/runtime-status-reporter";
import type { Logger } from "../telemetry/logger";
import { HttpApiRouter } from "./handlers/http-api-router";
import { createRemoteBridgeBootstrap } from "./remote-bridge-bootstrap";
import { RemoteBridgeMessageRouter } from "./remote-bridge-message-router";
import { RemoteBridgeServerLifecycle } from "./remote-bridge-server-lifecycle";
import {
  type BridgeEvent,
  type CoreStatePayload,
  serializeSession,
} from "./types";

export interface CoreTtlState {
  readonly idleSince: string | null;
  readonly idleTtlMs: number | null;
  readonly lastActivityAt: string | null;
  readonly secondsUntilShutdown: number | null;
}

interface RemoteBridgeHooks {
  readonly onClientConnected?: (clientId: string, total: number) => void;
  readonly onClientDisconnected?: (clientId: string, total: number) => void;
  readonly onShutdownRequested?: () => void;
}

export class RemoteBridge {
  private readonly config: CoreConfig;
  private readonly fileDropService: FileDropService;
  private readonly getTtlState?: () => CoreTtlState;
  private readonly hooks: RemoteBridgeHooks;
  private readonly logger: Logger;
  private readonly providerRegistry: ProviderRegistry;
  private readonly sessionManager: SessionManager;
  private readonly statusReporter: RuntimeStatusReporter;
  private readonly version: string;
  private readonly bootstrap: ReturnType<typeof createRemoteBridgeBootstrap>;
  private readonly messageRouter: RemoteBridgeMessageRouter;
  private readonly serverLifecycle: RemoteBridgeServerLifecycle;
  private latestStatus: RuntimeStatusEvent | null = null;
  private readonly unsubscribeStatus?: () => void;

  constructor(options: {
    readonly config: CoreConfig;
    readonly fileDropService: FileDropService;
    readonly getTtlState?: () => CoreTtlState;
    readonly hooks?: RemoteBridgeHooks;
    readonly logger: Logger;
    readonly projectRegistry: ProjectRegistry;
    readonly providerRegistry: ProviderRegistry;
    readonly sessionManager: SessionManager;
    readonly statusReporter: RuntimeStatusReporter;
    readonly version: string;
  }) {
    this.config = options.config;
    this.fileDropService = options.fileDropService;
    this.getTtlState = options.getTtlState;
    this.hooks = options.hooks ?? {};
    this.logger = options.logger;
    this.providerRegistry = options.providerRegistry;
    this.sessionManager = options.sessionManager;
    this.statusReporter = options.statusReporter;
    this.version = options.version;
    this.bootstrap = createRemoteBridgeBootstrap({
      buildInitialState: () => this.buildInitialState(),
      broadcaster: (event) => {
        this.broadcast(event);
      },
      config: this.config,
      logger: this.logger,
      onShutdownRequested: () => {
        this.hooks.onShutdownRequested?.();
      },
      projectRegistry: options.projectRegistry,
      providerRegistry: this.providerRegistry,
      sessionManager: this.sessionManager,
      version: this.version,
    });
    this.latestStatus = this.statusReporter.snapshot();
    this.unsubscribeStatus = this.statusReporter.subscribe((event) => {
      this.latestStatus = event;
      this.broadcast({ type: "core:loading-status", payload: event });
    });
    this.serverLifecycle = new RemoteBridgeServerLifecycle({
      config: this.config,
      getInitialState: () => this.buildInitialState(),
      getLatestStatus: () =>
        this.latestStatus ?? this.statusReporter.snapshot(),
      hooks: {
        onClientConnected: this.hooks.onClientConnected,
        onClientDisconnected: this.hooks.onClientDisconnected,
      },
      logger: this.logger,
      onIncomingMessage: async (
        clientId: string,
        _socket: WebSocket,
        incoming
      ) => {
        await this.messageRouter.handleIncomingMessage(clientId, incoming);
      },
      workspaceRuntime: this.bootstrap.workspaceRuntime,
    });
    this.messageRouter = new RemoteBridgeMessageRouter({
      dialogHistoryService: this.bootstrap.dialogHistoryService,
      dialogListService: this.bootstrap.dialogListService,
      dialogOpenService: this.bootstrap.dialogOpenService,
      getManager: () => this.serverLifecycle.getManager(),
      logger: this.logger,
      projectHandler: this.bootstrap.projectHandler,
      sessionHandler: this.bootstrap.sessionHandler,
      sessionManager: this.sessionManager,
      settingsHandler: this.bootstrap.settingsHandler,
      workflowRuntime: this.bootstrap.workflowRuntime,
      workspaceRuntime: this.bootstrap.workspaceRuntime,
    });
  }

  async start(): Promise<void> {
    await this.serverLifecycle.start((app) => {
      const router = new HttpApiRouter({
        app,
        fileDropService: this.fileDropService,
        getStatusInfo: () => ({
          clientCount: this.serverLifecycle.getClientCount(),
          ttlState: this.getTtlState?.(),
          sessionData: this.buildInitialState().sessions,
          providerData: this.providerRegistry.listProviders(),
        }),
        logger: this.logger,
        onWorkspaceSessionCreated: async (workspacePath, workspaceSlug) => {
          await this.bootstrap.workflowRuntime.connectWorkspace({
            workspaceRoot: workspacePath,
            workspaceSlug,
          });
        },
        sessionHandler: this.bootstrap.sessionHandler,
        sessionManager: this.sessionManager,
        sessionStorage: this.bootstrap.sessionStorage,
        systemHandler: this.bootstrap.systemHandler,
        workflowEventsService: this.bootstrap.workflowEventsService,
        workflowStateService: this.bootstrap.workflowStateService,
      });
      router.registerRoutes();
    });
  }

  async stop(): Promise<void> {
    this.unsubscribeStatus?.();
    await this.serverLifecycle.stop();
  }

  broadcast(event: BridgeEvent): void {
    this.serverLifecycle.broadcast(event);
  }

  private buildInitialState(): CoreStatePayload {
    return {
      sessions: this.sessionManager
        .listSessions()
        .map((session) => serializeSession(session)),
      providers: this.providerRegistry.listProviders(),
    };
  }
}
