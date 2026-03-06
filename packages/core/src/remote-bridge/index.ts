import { randomUUID } from "node:crypto";
import http from "node:http";
import cors from "cors";
import express from "express";
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
import { DialogSendTraceLogger } from "../telemetry/dialog-send-trace-logger";
import type { Logger } from "../telemetry/logger";
import { UnifiedSessionStorage } from "../unified-session/storage";
import { WorkflowRuntime } from "../workflow/runtime/workflow-runtime";
import { WorkspaceRuntimeFacade } from "../workspace-runtime/workspace-runtime-facade";
import type { WorkspaceSnapshotRequestPayload } from "../workspace-runtime/workspace-wire-types";
import { DialogHistoryService } from "./handlers/dialog-history-service";
import { DialogListService } from "./handlers/dialog-list-service";
import { DialogOpenService } from "./handlers/dialog-open-service";
import { HttpApiRouter } from "./handlers/http-api-router";
import { ProjectRequestHandler } from "./handlers/project-request-handler";
import { SessionRequestHandler } from "./handlers/session-request-handler";
import { SettingsRequestHandler } from "./handlers/settings-request-handler";
import { SystemRequestHandler } from "./handlers/system-request-handler";
import { WebSocketManager } from "./handlers/websocket-manager";
import { WorkflowEventsService } from "./handlers/workflow-events-service";
import { WorkflowStateService } from "./handlers/workflow-state-service";
import {
  type BridgeEvent,
  type CoreStatePayload,
  type IncomingMessage,
  serializeSession,
} from "./types";

export type CoreTtlState = {
  readonly idleTtlMs: number | null;
  readonly lastActivityAt: string | null;
  readonly idleSince: string | null;
  readonly secondsUntilShutdown: number | null;
};

type RemoteBridgeHooks = {
  readonly onClientConnected?: (clientId: string, total: number) => void;
  readonly onClientDisconnected?: (clientId: string, total: number) => void;
  readonly onShutdownRequested?: () => void;
};

type NormalizedDialogSendPayload = {
  readonly requestId: string;
  readonly outboundAttemptId: string;
  readonly workspaceSlug: string;
  readonly dialogId: string;
  readonly content: string;
};

export class RemoteBridge {
  private readonly config: CoreConfig;
  private readonly sessionManager: SessionManager;
  private readonly providerRegistry: ProviderRegistry;
  private readonly logger: Logger;
  private readonly version: string;
  private readonly hooks: RemoteBridgeHooks;
  private readonly statusReporter: RuntimeStatusReporter;
  private readonly getTtlState?: () => CoreTtlState;
  private readonly fileDropService: FileDropService;
  private readonly sessionStorage: UnifiedSessionStorage;
  private readonly workflowEventsService: WorkflowEventsService;
  private readonly workflowStateService: WorkflowStateService;
  private readonly workspaceRuntime: WorkspaceRuntimeFacade;
  private readonly workspaceRuntimeUnsubscribeByClient = new Map<
    string,
    () => void
  >();

  private readonly projectHandler: ProjectRequestHandler;
  private readonly dialogListService: DialogListService;
  private readonly dialogOpenService: DialogOpenService;
  private readonly dialogHistoryService: DialogHistoryService;
  private readonly dialogSendTrace = new DialogSendTraceLogger();
  private readonly sessionHandler: SessionRequestHandler;
  private readonly systemHandler: SystemRequestHandler;
  private readonly settingsHandler: SettingsRequestHandler;
  private readonly workflowRuntime: WorkflowRuntime;
  private wsManager?: WebSocketManager;
  private httpServer?: http.Server;
  private latestStatus: RuntimeStatusEvent | null = null;
  private readonly unsubscribeStatus?: () => void;

  constructor(options: {
    readonly config: CoreConfig;
    readonly sessionManager: SessionManager;
    readonly providerRegistry: ProviderRegistry;
    readonly projectRegistry: ProjectRegistry;
    readonly logger: Logger;
    readonly version: string;
    readonly hooks?: RemoteBridgeHooks;
    readonly statusReporter: RuntimeStatusReporter;
    readonly getTtlState?: () => CoreTtlState;
    readonly fileDropService: FileDropService;
  }) {
    this.config = options.config;
    this.sessionManager = options.sessionManager;
    this.providerRegistry = options.providerRegistry;
    this.logger = options.logger;
    this.version = options.version;
    this.hooks = options.hooks ?? {};
    this.statusReporter = options.statusReporter;
    this.getTtlState = options.getTtlState;
    this.fileDropService = options.fileDropService;
    this.workflowEventsService = new WorkflowEventsService({
      logger: this.logger,
    });
    this.workflowStateService = new WorkflowStateService({
      logger: this.logger,
      sessionManager: this.sessionManager,
    });
    this.sessionStorage = new UnifiedSessionStorage({
      workspaceSlug: this.config.claudeProjectSlug,
      logger: this.logger,
    });
    this.workspaceRuntime = new WorkspaceRuntimeFacade({
      hydrateWorkspaceSessions: (workspaceRoot) =>
        this.sessionManager
          .getSessionsByWorkspacePath(workspaceRoot)
          .map((session) => ({
            sessionId: session.id,
            nodeId: session.stage ?? "session",
            providerId: session.providerId,
            providerSessionId: session.providerSessionId ?? null,
            bindingStatus: session.providerSessionStatus,
          })),
    });

    this.projectHandler = new ProjectRequestHandler(
      options.projectRegistry,
      (event) => {
        this.broadcast(event);
      }
    );
    this.dialogListService = new DialogListService({ logger: this.logger });
    this.dialogOpenService = new DialogOpenService({ logger: this.logger });
    this.dialogHistoryService = new DialogHistoryService({
      logger: this.logger,
    });

    this.sessionHandler = new SessionRequestHandler({
      config: this.config,
      sessionManager: this.sessionManager,
      providerRegistry: this.providerRegistry,
      sessionStorage: this.sessionStorage,
      logger: this.logger,
      dialogSendTrace: this.dialogSendTrace,
      continuityClock: () => new Date().toISOString(),
      workspaceRuntime: this.workspaceRuntime,
      broadcaster: (event) => {
        this.broadcast(event as BridgeEvent);
      },
      stateBroadcaster: () =>
        this.broadcast({
          type: "core:state",
          payload: this.buildInitialState(),
        }),
    });

    this.systemHandler = new SystemRequestHandler(
      this.config,
      this.version,
      this.logger,
      () => {
        this.hooks.onShutdownRequested?.();
      }
    );

    this.settingsHandler = new SettingsRequestHandler({
      config: this.config,
      logger: this.logger,
      broadcaster: (event) => {
        this.broadcast(event as BridgeEvent);
      },
    });

    this.workflowRuntime = new WorkflowRuntime({
      logger: this.logger,
      providerRegistry: this.providerRegistry,
      sessionHandler: this.sessionHandler,
      onWatcherEvent: (event) => {
        this.workflowEventsService.record(event);
        this.workflowStateService.record(event);
      },
    });

    this.latestStatus = this.statusReporter.snapshot();
    this.unsubscribeStatus = this.statusReporter.subscribe((event) => {
      this.latestStatus = event;
      this.broadcast({ type: "core:loading-status", payload: event });
    });
  }

  async start(): Promise<void> {
    if (this.httpServer) {
      return;
    }

    const app = express();
    app.use(cors());
    app.use(express.json());

    const router = new HttpApiRouter({
      app,
      systemHandler: this.systemHandler,
      fileDropService: this.fileDropService,
      sessionHandler: this.sessionHandler,
      sessionManager: this.sessionManager,
      sessionStorage: this.sessionStorage,
      logger: this.logger,
      workflowEventsService: this.workflowEventsService,
      workflowStateService: this.workflowStateService,
      onWorkspaceSessionCreated: async (workspacePath, workspaceSlug) => {
        await this.workflowRuntime.connectWorkspace({
          workspaceRoot: workspacePath,
          workspaceSlug,
        });
      },
      getStatusInfo: () => ({
        clientCount: this.wsManager?.getClientCount() ?? 0,
        ttlState: this.getTtlState?.(),
        sessionData: this.buildInitialState().sessions,
        providerData: this.providerRegistry.listProviders(),
      }),
    });
    router.registerRoutes();

    this.httpServer = http.createServer(app);
    this.wsManager = new WebSocketManager({
      httpServer: this.httpServer,
      logger: this.logger,
      onIncomingMessage: this.handleIncomingMessage.bind(this),
      onClientConnected: (id, count) => {
        this.workspaceRuntimeUnsubscribeByClient.set(
          id,
          this.workspaceRuntime.subscribe(id, (message) => {
            this.wsManager?.sendToClient(id, message);
          })
        );
        this.hooks.onClientConnected?.(id, count);
      },
      onClientDisconnected: (id, count) => {
        this.workspaceRuntimeUnsubscribeByClient.get(id)?.();
        this.workspaceRuntimeUnsubscribeByClient.delete(id);
        this.hooks.onClientDisconnected?.(id, count);
      },
      getInitialState: () => this.buildInitialState(),
      getLatestStatus: () =>
        this.latestStatus ?? this.statusReporter.snapshot(),
    });
    this.wsManager.start();

    await new Promise<void>((resolve) => {
      this.httpServer?.listen(this.config.port, this.config.host, () => {
        this.logger.info("Remote bridge started", {
          host: this.config.host,
          port: this.config.port,
        });
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    this.unsubscribeStatus?.();
    for (const unsubscribe of this.workspaceRuntimeUnsubscribeByClient.values()) {
      unsubscribe();
    }
    this.workspaceRuntimeUnsubscribeByClient.clear();
    this.workspaceRuntime.dispose();
    this.wsManager?.stop();
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer?.close(() => {
          resolve();
        });
      });
      this.httpServer = undefined;
    }
  }

  broadcast(event: BridgeEvent): void {
    this.wsManager?.broadcast(event);
  }

  private buildInitialState(): CoreStatePayload {
    return {
      sessions: this.sessionManager
        .listSessions()
        .map((session) => serializeSession(session)),
      providers: this.providerRegistry.listProviders(),
    };
  }

  private async handleIncomingMessage(
    clientId: string,
    _socket: WebSocket,
    incoming: IncomingMessage
  ): Promise<void> {
    if (!this.ensureMessageAllowedForScope(clientId, incoming)) {
      return;
    }
    switch (incoming.type) {
      case "session:create":
        await this.handleSessionCreateMessage(clientId, incoming);
        break;
      case "settings:load":
        await this.settingsHandler.handleLoad();
        break;
      case "session:message":
        await this.sessionHandler.handleMessage(
          incoming.payload.sessionId,
          incoming.payload.content
        );
        break;
      case "session:delete":
        await this.sessionHandler.handleDelete(incoming.payload.sessionId);
        break;
      case "projects:list":
        this.projectHandler.handleList();
        break;
      case "dialog:list":
        await this.handleDialogList(clientId, incoming.payload);
        break;
      case "dialog:open":
        await this.handleDialogOpen(clientId, incoming.payload);
        break;
      case "dialog:history":
        await this.handleDialogHistory(clientId, incoming.payload);
        break;
      case "dialog:send":
        await this.handleDialogSend(clientId, incoming.payload);
        break;
      case "dialog:trace":
        this.handleDialogTrace(clientId, incoming.payload);
        break;
      case "projects:add":
        this.projectHandler.handleAdd(
          incoming.payload.path,
          incoming.payload.name
        );
        break;
      case "projects:remove":
        this.projectHandler.handleRemove(incoming.payload.id);
        break;
      case "workspace:scope:set":
        this.handleWorkspaceScopeSet(clientId, incoming.payload);
        break;
      case "workspace:select":
        this.handleWorkspaceSelect(clientId, incoming.payload);
        break;
      case "workspace:snapshot:request":
        this.handleWorkspaceSnapshotRequest(clientId, incoming.payload);
        break;
      default:
        break;
    }
  }

  private ensureMessageAllowedForScope(
    clientId: string,
    incoming: IncomingMessage
  ): boolean {
    const scope = this.wsManager?.getWorkspaceScope(clientId);
    if (!scope?.enabled) {
      return true;
    }

    if (incoming.type === "session:create") {
      if (!scope.workspacePath) {
        this.sendScopeViolation(
          clientId,
          incoming.type,
          "Workspace scope is not selected"
        );
        return false;
      }
      const requestedWorkspacePath =
        incoming.payload?.workspacePath ?? scope.workspacePath;
      if (requestedWorkspacePath !== scope.workspacePath) {
        this.sendScopeViolation(
          clientId,
          incoming.type,
          "session:create rejected for out-of-scope workspace"
        );
        return false;
      }
    }

    if (
      incoming.type === "session:message" ||
      incoming.type === "session:delete"
    ) {
      if (!scope.workspacePath) {
        this.sendScopeViolation(
          clientId,
          incoming.type,
          "Workspace scope is not selected"
        );
        return false;
      }
      const sessionId = incoming.payload.sessionId;
      const session = this.sessionManager.getSession(sessionId);
      if (session && session.workspacePath !== scope.workspacePath) {
        this.sendScopeViolation(
          clientId,
          incoming.type,
          "Session command rejected for out-of-scope workspace"
        );
        return false;
      }
    }

    return true;
  }

  private async handleDialogList(
    clientId: string,
    payload: { readonly requestId: string; readonly workspaceSlug: string }
  ): Promise<void> {
    const wsManager = this.wsManager;
    if (!wsManager) {
      return;
    }
    const scope = wsManager.getWorkspaceScope(clientId);
    const workspaceRoot = scope?.workspacePath ?? null;
    if (!workspaceRoot) {
      this.sendScopeViolation(
        clientId,
        "dialog:list",
        "Workspace scope is not selected"
      );
      return;
    }
    const workspaceSlug =
      typeof payload.workspaceSlug === "string" ? payload.workspaceSlug : "";
    if (workspaceSlug.trim().length === 0) {
      this.sendScopeViolation(clientId, "dialog:list", "Missing workspaceSlug");
      return;
    }
    const dialogs = await this.dialogListService.listDialogs({
      workspaceRoot,
      workspaceSlug,
      runtimeSessions:
        this.sessionManager.getSessionsByWorkspacePath(workspaceRoot),
    });
    wsManager.sendToClient(clientId, {
      type: "dialog:list:result",
      payload: {
        requestId: payload.requestId,
        workspaceSlug,
        dialogs,
      },
    });
  }

  private async handleDialogOpen(
    clientId: string,
    payload: {
      readonly requestId: string;
      readonly workspaceSlug: string;
      readonly dialogId: string;
    }
  ): Promise<void> {
    const wsManager = this.wsManager;
    if (!wsManager) {
      return;
    }
    const scope = wsManager.getWorkspaceScope(clientId);
    const workspaceRoot = scope?.workspacePath ?? null;
    if (!workspaceRoot) {
      this.sendScopeViolation(
        clientId,
        "dialog:open",
        "Workspace scope is not selected"
      );
      return;
    }
    const workspaceSlug =
      typeof payload.workspaceSlug === "string" ? payload.workspaceSlug : "";
    const dialogId =
      typeof payload.dialogId === "string" ? payload.dialogId : "";
    if (workspaceSlug.trim().length === 0) {
      wsManager.sendToClient(clientId, {
        type: "dialog:open:result",
        payload: {
          requestId: payload.requestId,
          workspaceSlug,
          dialogId,
          dialog: null,
          error: "Missing workspaceSlug",
        },
      });
      return;
    }
    if (dialogId.trim().length === 0) {
      wsManager.sendToClient(clientId, {
        type: "dialog:open:result",
        payload: {
          requestId: payload.requestId,
          workspaceSlug,
          dialogId,
          dialog: null,
          error: "Missing dialogId",
        },
      });
      return;
    }

    const dialog = await this.dialogOpenService.openDialog({
      workspaceRoot,
      workspaceSlug,
      dialogId,
    });
    wsManager.sendToClient(clientId, {
      type: "dialog:open:result",
      payload: {
        requestId: payload.requestId,
        workspaceSlug,
        dialogId,
        dialog,
        error: dialog ? null : "Dialog not found",
      },
    });
  }

  private async handleDialogHistory(
    clientId: string,
    payload: {
      readonly requestId: string;
      readonly workspaceSlug: string;
      readonly dialogId: string;
      readonly cursor?: number;
    }
  ): Promise<void> {
    const wsManager = this.wsManager;
    if (!wsManager) {
      return;
    }
    const scope = wsManager.getWorkspaceScope(clientId);
    const workspaceRoot = scope?.workspacePath ?? null;
    if (!workspaceRoot) {
      this.sendScopeViolation(
        clientId,
        "dialog:history",
        "Workspace scope is not selected"
      );
      return;
    }
    const workspaceSlug =
      typeof payload.workspaceSlug === "string" ? payload.workspaceSlug : "";
    const dialogId =
      typeof payload.dialogId === "string" ? payload.dialogId : "";
    const cursor =
      typeof payload.cursor === "number" && Number.isFinite(payload.cursor)
        ? payload.cursor
        : null;

    if (workspaceSlug.trim().length === 0 || dialogId.trim().length === 0) {
      wsManager.sendToClient(clientId, {
        type: "dialog:history:result",
        payload: {
          requestId: payload.requestId,
          workspaceSlug,
          dialogId,
          lastCursor: 0,
          messages: [],
          error: "Missing workspaceSlug or dialogId",
        },
      });
      return;
    }

    const result = await this.dialogHistoryService.readHistory({
      workspaceRoot,
      workspaceSlug,
      dialogId,
      cursor,
    });
    wsManager.sendToClient(clientId, {
      type: "dialog:history:result",
      payload: {
        requestId: payload.requestId,
        workspaceSlug,
        dialogId,
        lastCursor: result.lastCursor,
        messages: result.messages,
        error: null,
      },
    });
  }

  private async handleDialogSend(
    clientId: string,
    payload: {
      readonly requestId: string;
      readonly outboundAttemptId: string;
      readonly workspaceSlug: string;
      readonly dialogId: string;
      readonly content: string;
    }
  ): Promise<void> {
    const wsManager = this.wsManager;
    if (!wsManager) {
      return;
    }
    const normalizedPayload = this.normalizeDialogSendPayload(payload);
    this.traceDialogSendReceived(clientId, normalizedPayload);
    const scope = wsManager.getWorkspaceScope(clientId);
    const workspaceRoot = scope?.workspacePath ?? null;
    if (!workspaceRoot) {
      this.sendScopeViolation(
        clientId,
        "dialog:send",
        "Workspace scope is not selected"
      );
      return;
    }
    if (
      normalizedPayload.workspaceSlug.trim().length === 0 ||
      normalizedPayload.dialogId.trim().length === 0 ||
      normalizedPayload.content.trim().length === 0
    ) {
      this.sendDialogSendAck(clientId, normalizedPayload, {
        status: "rejected",
        error: "Missing workspaceSlug/dialogId/content",
      });
      return;
    }
    this.dialogSendTrace.record({
      event: "core.dialog_send.scope_resolved",
      outboundAttemptId: normalizedPayload.outboundAttemptId,
      requestId: normalizedPayload.requestId,
      workspaceSlug: normalizedPayload.workspaceSlug,
      dialogId: normalizedPayload.dialogId,
      providerId: "unknown",
      contentLength: normalizedPayload.content.length,
      payload: { clientId, workspaceRoot },
    });

    const result = await this.sessionHandler.handleDialogSend({
      workspaceRoot,
      workspaceSlug: normalizedPayload.workspaceSlug,
      dialogId: normalizedPayload.dialogId,
      content: normalizedPayload.content,
      requestId: normalizedPayload.requestId,
      outboundAttemptId: normalizedPayload.outboundAttemptId,
    });
    this.sendDialogSendAck(clientId, normalizedPayload, {
      status: result.ok ? "sent" : "rejected",
      error: result.ok ? null : result.error,
      providerId: result.providerId ?? "unknown",
      providerSessionId: result.providerSessionId ?? undefined,
      sessionId: result.sessionId,
    });
  }

  private normalizeDialogSendPayload(payload: {
    readonly requestId: string;
    readonly outboundAttemptId: string;
    readonly workspaceSlug: string;
    readonly dialogId: string;
    readonly content: string;
  }): NormalizedDialogSendPayload {
    return {
      requestId: payload.requestId,
      outboundAttemptId:
        typeof payload.outboundAttemptId === "string" &&
        payload.outboundAttemptId.trim().length > 0
          ? payload.outboundAttemptId
          : `missing-outbound-attempt-${payload.requestId}`,
      workspaceSlug:
        typeof payload.workspaceSlug === "string" ? payload.workspaceSlug : "",
      dialogId: typeof payload.dialogId === "string" ? payload.dialogId : "",
      content: typeof payload.content === "string" ? payload.content : "",
    };
  }

  private traceDialogSendReceived(
    clientId: string,
    payload: NormalizedDialogSendPayload
  ): void {
    this.dialogSendTrace.record({
      event: "core.dialog_send.received",
      outboundAttemptId: payload.outboundAttemptId,
      requestId: payload.requestId,
      workspaceSlug: payload.workspaceSlug,
      dialogId: payload.dialogId,
      providerId: "unknown",
      contentLength: payload.content.length,
      payload: { clientId },
    });
  }

  private sendDialogSendAck(
    clientId: string,
    payload: NormalizedDialogSendPayload,
    options: {
      readonly status: "sent" | "rejected";
      readonly error: string | null;
      readonly providerId?: string;
      readonly providerSessionId?: string;
      readonly sessionId?: string;
    }
  ): void {
    this.dialogSendTrace.record({
      event: "core.dialog_send.ack",
      outboundAttemptId: payload.outboundAttemptId,
      requestId: payload.requestId,
      workspaceSlug: payload.workspaceSlug,
      dialogId: payload.dialogId,
      providerId: options.providerId ?? "unknown",
      providerSessionId: options.providerSessionId,
      threadId: options.providerSessionId,
      sessionId: options.sessionId,
      contentLength: payload.content.length,
      error: options.error ?? undefined,
      payload: { status: options.status },
    });
    this.wsManager?.sendToClient(clientId, {
      type: "dialog:send:ack",
      payload: {
        requestId: payload.requestId,
        workspaceSlug: payload.workspaceSlug,
        dialogId: payload.dialogId,
        status: options.status,
        error: options.error,
      },
    });
  }

  private handleDialogTrace(
    clientId: string,
    payload: {
      readonly event: string;
      readonly requestId: string;
      readonly outboundAttemptId: string;
      readonly workspaceSlug: string;
      readonly dialogId: string;
      readonly contentLength?: number;
      readonly payload?: unknown;
      readonly error?: string | null;
    }
  ): void {
    if (!payload.event.startsWith("pm.dialog_send.")) {
      return;
    }
    this.dialogSendTrace.record({
      event: payload.event,
      outboundAttemptId:
        typeof payload.outboundAttemptId === "string" &&
        payload.outboundAttemptId.trim().length > 0
          ? payload.outboundAttemptId
          : `missing-outbound-attempt-${payload.requestId}`,
      requestId: payload.requestId,
      workspaceSlug:
        typeof payload.workspaceSlug === "string" ? payload.workspaceSlug : "",
      dialogId: typeof payload.dialogId === "string" ? payload.dialogId : "",
      providerId: "unknown",
      contentLength:
        typeof payload.contentLength === "number" &&
        Number.isFinite(payload.contentLength)
          ? payload.contentLength
          : undefined,
      payload:
        payload.payload === undefined
          ? { clientId }
          : { clientId, details: payload.payload },
      error:
        typeof payload.error === "string" && payload.error.trim().length > 0
          ? payload.error
          : undefined,
    });
  }

  private sendScopeViolation(
    clientId: string,
    command: string,
    message: string
  ): void {
    this.wsManager?.sendToClient(clientId, {
      type: "command:error",
      payload: {
        requestId: randomUUID(),
        command,
        message,
        code: "workspace_scope_violation",
      },
    });
  }

  private handleWorkspaceScopeSet(clientId: string, payload: unknown): void {
    const wsManager = this.wsManager;
    if (!wsManager) {
      return;
    }
    const ack = wsManager.setWorkspaceScope(clientId, payload);
    wsManager.sendToClient(clientId, {
      type: "workspace:scope:ack",
      payload: ack,
    });
  }

  private handleWorkspaceSelect(clientId: string, payload: unknown): void {
    const wsManager = this.wsManager;
    if (!wsManager) {
      return;
    }
    const requestRecord =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as {
            readonly requestId?: unknown;
            readonly workspaceRoot?: unknown;
            readonly reason?: unknown;
          })
        : null;
    const parsedWorkspaceRoot =
      requestRecord?.workspaceRoot === null ||
      typeof requestRecord?.workspaceRoot === "string"
        ? requestRecord.workspaceRoot
        : null;
    const parsedReason =
      requestRecord?.reason === "workspace_selected" ||
      requestRecord?.reason === "reconnect" ||
      requestRecord?.reason === "workspace_cleared"
        ? requestRecord.reason
        : "workspace_selected";
    const ack = this.workspaceRuntime.select({
      clientId,
      request: {
        requestId:
          typeof requestRecord?.requestId === "string"
            ? requestRecord.requestId
            : randomUUID(),
        workspaceRoot: parsedWorkspaceRoot,
        reason: parsedReason,
      },
    });
    wsManager.sendToClient(clientId, {
      type: "workspace:select:ack",
      payload: ack,
    });
    if (ack.status !== "applied") {
      return;
    }
    wsManager.setWorkspaceScopeForClient(clientId, ack.workspaceRoot);
    if (!ack.workspaceRoot) {
      return;
    }
    const scopedSessionIds = this.sessionManager
      .getSessionsByWorkspacePath(ack.workspaceRoot)
      .map((session) => session.id);
    wsManager.populateSessionWorkspaceScope(
      ack.workspaceRoot,
      scopedSessionIds
    );
  }

  private handleWorkspaceSnapshotRequest(
    clientId: string,
    payload: WorkspaceSnapshotRequestPayload
  ): void {
    const wsManager = this.wsManager;
    if (!wsManager) {
      return;
    }
    const scope = wsManager.getWorkspaceScope(clientId);
    if (
      scope?.enabled &&
      scope.workspacePath &&
      payload.workspaceRoot !== scope.workspacePath
    ) {
      this.sendScopeViolation(
        clientId,
        "workspace:snapshot:request",
        "workspace:snapshot:request rejected for out-of-scope workspace"
      );
      return;
    }
    const message = this.workspaceRuntime.requestSnapshot(clientId);
    if (!message) {
      this.sendScopeViolation(
        clientId,
        "workspace:snapshot:request",
        "No active workspace selection"
      );
      return;
    }
    wsManager.sendToClient(clientId, message);
  }

  private async handleSessionCreateMessage(
    clientId: string,
    incoming: Extract<IncomingMessage, { readonly type: "session:create" }>
  ): Promise<void> {
    const resolvedWorkspacePath =
      incoming.payload?.workspacePath ??
      this.wsManager?.getWorkspaceScope(clientId)?.workspacePath ??
      undefined;
    const initiativeSlug = incoming.payload?.initiativeSlug ?? null;

    await this.sessionHandler.handleCreate(
      incoming.payload?.providerId,
      resolvedWorkspacePath,
      {
        initiativeSlug,
        providerSessionId: incoming.payload?.providerSessionId ?? null,
        stage: incoming.payload?.stage ?? null,
        runSlug: incoming.payload?.runSlug ?? null,
      }
    );

    if (!(resolvedWorkspacePath && initiativeSlug)) {
      return;
    }

    try {
      await this.workflowRuntime.connectWorkspace({
        workspaceRoot: resolvedWorkspacePath,
        workspaceSlug: initiativeSlug,
      });
    } catch (error) {
      this.logger.warn(
        "Failed to connect workflow runtime from session:create",
        {
          workspacePath: resolvedWorkspacePath,
          workspaceSlug: initiativeSlug,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }
}
