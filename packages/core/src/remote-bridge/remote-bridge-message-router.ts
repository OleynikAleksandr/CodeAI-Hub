import { randomUUID } from "node:crypto";
import type { SessionManager } from "../session-manager";
import type { Logger } from "../telemetry/logger";
import type { WorkflowRuntime } from "../workflow/runtime/workflow-runtime";
import type { WorkspaceRuntimeFacade } from "../workspace-runtime/workspace-runtime-facade";
import type { DialogHistoryService } from "./handlers/dialog-history-service";
import type { DialogListService } from "./handlers/dialog-list-service";
import type { DialogOpenService } from "./handlers/dialog-open-service";
import type { ProjectRequestHandler } from "./handlers/project-request-handler";
import type { SessionRequestHandler } from "./handlers/session-request-handler";
import type { SettingsRequestHandler } from "./handlers/settings-request-handler";
import type { WebSocketManager } from "./handlers/websocket-manager";
import { RemoteBridgeDialogCommandRouter } from "./remote-bridge-dialog-command-router";
import { RemoteBridgeWorkspaceCommandRouter } from "./remote-bridge-workspace-command-router";
import type { IncomingMessage } from "./types";

interface RemoteBridgeMessageRouterDependencies {
  readonly dialogHistoryService: DialogHistoryService;
  readonly dialogListService: DialogListService;
  readonly dialogOpenService: DialogOpenService;
  readonly getManager: () => WebSocketManager | undefined;
  readonly logger: Logger;
  readonly projectHandler: ProjectRequestHandler;
  readonly sessionHandler: SessionRequestHandler;
  readonly sessionManager: SessionManager;
  readonly settingsHandler: SettingsRequestHandler;
  readonly workflowRuntime: WorkflowRuntime;
  readonly workspaceRuntime: WorkspaceRuntimeFacade;
}

export class RemoteBridgeMessageRouter {
  private readonly deps: RemoteBridgeMessageRouterDependencies;
  private readonly dialogCommandRouter: RemoteBridgeDialogCommandRouter;
  private readonly workspaceCommandRouter: RemoteBridgeWorkspaceCommandRouter;

  constructor(deps: RemoteBridgeMessageRouterDependencies) {
    this.deps = deps;
    this.dialogCommandRouter = new RemoteBridgeDialogCommandRouter({
      dialogHistoryService: deps.dialogHistoryService,
      dialogListService: deps.dialogListService,
      dialogOpenService: deps.dialogOpenService,
      getManager: deps.getManager,
      sendScopeViolation: (clientId, command, message) => {
        this.sendScopeViolation(clientId, command, message);
      },
      sessionHandler: deps.sessionHandler,
      sessionManager: deps.sessionManager,
    });
    this.workspaceCommandRouter = new RemoteBridgeWorkspaceCommandRouter({
      getManager: deps.getManager,
      sendScopeViolation: (clientId, command, message) => {
        this.sendScopeViolation(clientId, command, message);
      },
      sessionManager: deps.sessionManager,
      workspaceRuntime: deps.workspaceRuntime,
    });
  }

  async handleIncomingMessage(
    clientId: string,
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
        await this.deps.settingsHandler.handleLoad();
        break;
      case "session:message":
        await this.deps.sessionHandler.handleMessage(
          incoming.payload.sessionId,
          incoming.payload.content
        );
        break;
      case "session:delete":
        await this.deps.sessionHandler.handleDelete(incoming.payload.sessionId);
        break;
      case "projects:list":
        this.deps.projectHandler.handleList();
        break;
      case "dialog:list":
        await this.dialogCommandRouter.handleDialogList(
          clientId,
          incoming.payload
        );
        break;
      case "dialog:open":
        await this.dialogCommandRouter.handleDialogOpen(
          clientId,
          incoming.payload
        );
        break;
      case "dialog:history":
        await this.dialogCommandRouter.handleDialogHistory(
          clientId,
          incoming.payload
        );
        break;
      case "dialog:send":
        await this.dialogCommandRouter.handleDialogSend(
          clientId,
          incoming.payload
        );
        break;
      case "dialog:switch:request":
        await this.handleDialogSwitchRequest(incoming.payload);
        break;
      case "projects:add":
        this.deps.projectHandler.handleAdd(
          incoming.payload.path,
          incoming.payload.name
        );
        break;
      case "projects:remove":
        this.deps.projectHandler.handleRemove(incoming.payload.id);
        break;
      case "workspace:scope:set":
        this.workspaceCommandRouter.handleWorkspaceScopeSet(
          clientId,
          incoming.payload
        );
        break;
      case "workspace:select":
        this.workspaceCommandRouter.handleWorkspaceSelect(
          clientId,
          incoming.payload
        );
        break;
      case "workspace:snapshot:request":
        this.workspaceCommandRouter.handleWorkspaceSnapshotRequest(
          clientId,
          incoming.payload
        );
        break;
      default:
        break;
    }
  }

  private ensureMessageAllowedForScope(
    clientId: string,
    incoming: IncomingMessage
  ): boolean {
    const scope = this.deps.getManager()?.getWorkspaceScope(clientId);
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
      const session = this.deps.sessionManager.getSession(
        incoming.payload.sessionId
      );
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

  private async handleDialogSwitchRequest(payload: {
    readonly mode?: unknown;
    readonly sessionId?: unknown;
    readonly targetModelId?: unknown;
    readonly targetProviderId?: unknown;
  }): Promise<void> {
    const sessionId =
      typeof payload.sessionId === "string" ? payload.sessionId : null;
    const mode = typeof payload.mode === "string" ? payload.mode : null;
    if (!(sessionId && mode)) {
      return;
    }
    await this.deps.sessionHandler.handleSwitchRequest({
      sessionId,
      mode: mode as "retry_in_place" | "switch_model" | "switch_provider",
      targetProviderId:
        typeof payload.targetProviderId === "string"
          ? payload.targetProviderId
          : undefined,
      targetModelId:
        typeof payload.targetModelId === "string"
          ? payload.targetModelId
          : undefined,
    });
  }

  private handleSessionCreateMessage(
    clientId: string,
    incoming: Extract<IncomingMessage, { readonly type: "session:create" }>
  ): Promise<void> {
    const resolvedWorkspacePath =
      incoming.payload?.workspacePath ??
      this.deps.getManager()?.getWorkspaceScope(clientId)?.workspacePath ??
      undefined;
    const initiativeSlug = incoming.payload?.initiativeSlug ?? null;

    return this.createSessionWithWorkflowBinding({
      incoming,
      initiativeSlug,
      resolvedWorkspacePath,
    });
  }

  private async createSessionWithWorkflowBinding(params: {
    readonly incoming: Extract<
      IncomingMessage,
      { readonly type: "session:create" }
    >;
    readonly initiativeSlug: string | null;
    readonly resolvedWorkspacePath: string | undefined;
  }): Promise<void> {
    await this.deps.sessionHandler.handleCreate(
      params.incoming.payload?.providerId,
      params.resolvedWorkspacePath,
      {
        initiativeSlug: params.initiativeSlug,
        providerSessionId: params.incoming.payload?.providerSessionId ?? null,
        stage: params.incoming.payload?.stage ?? null,
        runSlug: params.incoming.payload?.runSlug ?? null,
      }
    );
    if (!(params.resolvedWorkspacePath && params.initiativeSlug)) {
      return;
    }
    try {
      await this.deps.workflowRuntime.connectWorkspace({
        workspaceRoot: params.resolvedWorkspacePath,
        workspaceSlug: params.initiativeSlug,
      });
    } catch (error) {
      this.deps.logger.warn(
        "Failed to connect workflow runtime from session:create",
        {
          workspacePath: params.resolvedWorkspacePath,
          workspaceSlug: params.initiativeSlug,
          error: error instanceof Error ? error.message : String(error),
        }
      );
    }
  }

  private sendScopeViolation(
    clientId: string,
    command: string,
    message: string
  ): void {
    const wsManager = this.deps.getManager();
    if (!wsManager) {
      return;
    }
    wsManager.sendToClient(clientId, {
      type: "command:error",
      payload: {
        requestId: randomUUID(),
        command,
        message,
        code: "workspace_scope_violation",
      },
    });
  }
}
