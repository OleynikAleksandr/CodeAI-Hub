import path from "node:path";
import type { SessionManager } from "../session-manager";
import type { WorkspaceRuntimeFacade } from "../workspace-runtime/workspace-runtime-facade";
import type { DialogHistoryService } from "./handlers/dialog-history-service";
import type { DialogListService } from "./handlers/dialog-list-service";
import type { DialogOpenService } from "./handlers/dialog-open-service";
import { materializeContinuityEntries } from "./handlers/session-continuity-materializer";
import type { SessionProviderBindingService } from "./handlers/session-provider-binding-service";
import type { SessionRequestHandler } from "./handlers/session-request-handler";
import type { WebSocketManager } from "./handlers/websocket-manager";
import type { IncomingMessage } from "./types";

interface RemoteBridgeDialogCommandRouterDependencies {
  readonly dialogHistoryService: DialogHistoryService;
  readonly dialogListService: DialogListService;
  readonly dialogOpenService: DialogOpenService;
  readonly getManager: () => WebSocketManager | undefined;
  readonly providerBindingService: SessionProviderBindingService;
  readonly sendScopeViolation: (
    clientId: string,
    command: string,
    message: string
  ) => void;
  readonly sessionHandler: SessionRequestHandler;
  readonly sessionManager: SessionManager;
  readonly workspaceRuntime: WorkspaceRuntimeFacade;
}

interface ScopedWorkspace {
  readonly workspaceRoot: string;
  readonly wsManager: WebSocketManager;
}

export class RemoteBridgeDialogCommandRouter {
  private readonly deps: RemoteBridgeDialogCommandRouterDependencies;

  constructor(deps: RemoteBridgeDialogCommandRouterDependencies) {
    this.deps = deps;
  }

  async handleDialogHistory(
    clientId: string,
    payload: Extract<
      IncomingMessage,
      { readonly type: "dialog:history" }
    >["payload"]
  ): Promise<void> {
    const scoped = this.resolveScopedWorkspace(clientId, "dialog:history");
    if (!scoped) {
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
      scoped.wsManager.sendToClient(clientId, {
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
    const dialogWorkspaceRoot = this.resolveDialogWorkspaceRoot(
      scoped,
      payload.workspacePath,
      clientId,
      "dialog:history"
    );
    if (!dialogWorkspaceRoot) {
      return;
    }
    const result = await this.deps.dialogHistoryService.readHistory({
      workspaceRoot: dialogWorkspaceRoot,
      workspaceSlug,
      dialogId,
      cursor,
    });
    scoped.wsManager.sendToClient(clientId, {
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

  async handleDialogList(
    clientId: string,
    payload: Extract<
      IncomingMessage,
      { readonly type: "dialog:list" }
    >["payload"]
  ): Promise<void> {
    const scoped = this.resolveScopedWorkspace(clientId, "dialog:list");
    if (!scoped) {
      return;
    }
    const workspaceSlug =
      typeof payload.workspaceSlug === "string" ? payload.workspaceSlug : "";
    if (workspaceSlug.trim().length === 0) {
      this.sendCommandError(
        scoped.wsManager,
        clientId,
        payload.requestId,
        "dialog:list",
        "Missing workspaceSlug"
      );
      return;
    }
    const dialogWorkspaceRoot = this.resolveDialogWorkspaceRoot(
      scoped,
      payload.workspacePath,
      clientId,
      "dialog:list"
    );
    if (!dialogWorkspaceRoot) {
      return;
    }
    const dialogs = await this.deps.dialogListService.listDialogs({
      workspaceRoot: dialogWorkspaceRoot,
      workspaceSlug,
      runtimeSessions:
        this.deps.sessionManager.getSessionsByWorkspacePath(
          dialogWorkspaceRoot
        ),
    });
    materializeContinuityEntries({
      deps: {
        sessionManager: this.deps.sessionManager,
        providerBindingService: this.deps.providerBindingService,
        workspaceRuntime: this.deps.workspaceRuntime,
      },
      entries: dialogs,
      workspaceRoot: dialogWorkspaceRoot,
      workspaceSlug,
    });
    scoped.wsManager.sendToClient(clientId, {
      type: "dialog:list:result",
      payload: {
        requestId: payload.requestId,
        workspaceSlug,
        dialogs,
      },
    });
  }

  async handleDialogOpen(
    clientId: string,
    payload: Extract<
      IncomingMessage,
      { readonly type: "dialog:open" }
    >["payload"]
  ): Promise<void> {
    const scoped = this.resolveScopedWorkspace(clientId, "dialog:open");
    if (!scoped) {
      return;
    }
    const workspaceSlug =
      typeof payload.workspaceSlug === "string" ? payload.workspaceSlug : "";
    const dialogId =
      typeof payload.dialogId === "string" ? payload.dialogId : "";
    if (workspaceSlug.trim().length === 0 || dialogId.trim().length === 0) {
      scoped.wsManager.sendToClient(clientId, {
        type: "dialog:open:result",
        payload: {
          requestId: payload.requestId,
          workspaceSlug,
          dialogId,
          dialog: null,
          error:
            workspaceSlug.trim().length === 0
              ? "Missing workspaceSlug"
              : "Missing dialogId",
        },
      });
      return;
    }
    const dialogWorkspaceRoot = this.resolveDialogWorkspaceRoot(
      scoped,
      payload.workspacePath,
      clientId,
      "dialog:open"
    );
    if (!dialogWorkspaceRoot) {
      return;
    }
    const dialog = await this.deps.dialogOpenService.openDialog({
      workspaceRoot: dialogWorkspaceRoot,
      workspaceSlug,
      dialogId,
    });
    scoped.wsManager.sendToClient(clientId, {
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

  async handleDialogSend(
    clientId: string,
    payload: Extract<
      IncomingMessage,
      { readonly type: "dialog:send" }
    >["payload"]
  ): Promise<void> {
    const scoped = this.resolveScopedWorkspace(clientId, "dialog:send");
    if (!scoped) {
      return;
    }
    const workspaceSlug =
      typeof payload.workspaceSlug === "string" ? payload.workspaceSlug : "";
    const dialogId =
      typeof payload.dialogId === "string" ? payload.dialogId : "";
    const content = typeof payload.content === "string" ? payload.content : "";
    if (
      workspaceSlug.trim().length === 0 ||
      dialogId.trim().length === 0 ||
      content.trim().length === 0
    ) {
      scoped.wsManager.sendToClient(clientId, {
        type: "dialog:send:ack",
        payload: {
          requestId: payload.requestId,
          workspaceSlug,
          dialogId,
          status: "rejected",
          error: "Missing workspaceSlug/dialogId/content",
        },
      });
      return;
    }
    const dialogWorkspaceRoot = this.resolveDialogWorkspaceRoot(
      scoped,
      payload.workspacePath,
      clientId,
      "dialog:send"
    );
    if (!dialogWorkspaceRoot) {
      return;
    }
    const result = await this.deps.sessionHandler.handleDialogSend({
      workspaceRoot: dialogWorkspaceRoot,
      workspaceSlug,
      dialogId,
      content,
      turnOptions: payload.turnOptions,
    });
    scoped.wsManager.sendToClient(clientId, {
      type: "dialog:send:ack",
      payload: {
        requestId: payload.requestId,
        workspaceSlug,
        dialogId,
        status: result.ok ? "sent" : "rejected",
        error: result.ok ? null : result.error,
      },
    });
  }

  private resolveScopedWorkspace(
    clientId: string,
    command: string
  ): ScopedWorkspace | null {
    const wsManager = this.deps.getManager();
    if (!wsManager) {
      return null;
    }
    const workspaceRoot = wsManager.getWorkspaceScope(clientId)?.workspacePath;
    if (!workspaceRoot) {
      this.deps.sendScopeViolation(
        clientId,
        command,
        "Workspace scope is not selected"
      );
      return null;
    }
    return { workspaceRoot, wsManager };
  }

  private resolveDialogWorkspaceRoot(
    scoped: ScopedWorkspace,
    requestedWorkspacePath: string | undefined,
    clientId: string,
    command: string
  ): string | null {
    const requested = requestedWorkspacePath?.trim();
    if (!requested) {
      return scoped.workspaceRoot;
    }
    const scopedRoot = path.resolve(scoped.workspaceRoot);
    const requestedRoot = path.resolve(requested);
    const scopedWorktreesRoot = path.resolve(
      `${scoped.workspaceRoot}.worktrees`
    );
    const isScopedRoot = requestedRoot === scopedRoot;
    const isScopedWorktree =
      requestedRoot === scopedWorktreesRoot ||
      requestedRoot.startsWith(`${scopedWorktreesRoot}${path.sep}`);
    if (isScopedRoot || isScopedWorktree) {
      return requestedRoot;
    }
    this.deps.sendScopeViolation(
      clientId,
      command,
      "dialog command rejected for out-of-scope workspace"
    );
    return null;
  }

  private sendCommandError(
    wsManager: WebSocketManager,
    clientId: string,
    requestId: string,
    command: string,
    message: string
  ): void {
    wsManager.sendToClient(clientId, {
      type: "command:error",
      payload: {
        requestId,
        command,
        message,
        code: "workspace_scope_violation",
      },
    });
  }
}
