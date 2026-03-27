import { randomUUID } from "node:crypto";
import type { SessionManager } from "../session-manager";
import type { WorkspaceRuntimeFacade } from "../workspace-runtime/workspace-runtime-facade";
import type { WebSocketManager } from "./handlers/websocket-manager";
import type { IncomingMessage } from "./types";

interface RemoteBridgeWorkspaceCommandRouterDependencies {
  readonly getManager: () => WebSocketManager | undefined;
  readonly sendScopeViolation: (
    clientId: string,
    command: string,
    message: string
  ) => void;
  readonly sessionManager: SessionManager;
  readonly workspaceRuntime: WorkspaceRuntimeFacade;
}

export class RemoteBridgeWorkspaceCommandRouter {
  private readonly deps: RemoteBridgeWorkspaceCommandRouterDependencies;

  constructor(deps: RemoteBridgeWorkspaceCommandRouterDependencies) {
    this.deps = deps;
  }

  handleWorkspaceScopeSet(clientId: string, payload: unknown): void {
    const wsManager = this.deps.getManager();
    if (!wsManager) {
      return;
    }
    const ack = wsManager.setWorkspaceScope(clientId, payload);
    wsManager.sendToClient(clientId, {
      type: "workspace:scope:ack",
      payload: ack,
    });
  }

  handleWorkspaceSelect(clientId: string, payload: unknown): void {
    const wsManager = this.deps.getManager();
    if (!wsManager) {
      return;
    }
    const requestRecord =
      payload && typeof payload === "object" && !Array.isArray(payload)
        ? (payload as {
            readonly reason?: unknown;
            readonly requestId?: unknown;
            readonly workspaceRoot?: unknown;
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
    const ack = this.deps.workspaceRuntime.select({
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
    if (ack.status !== "applied" || !ack.workspaceRoot) {
      return;
    }
    wsManager.setWorkspaceScopeForClient(clientId, ack.workspaceRoot);
    const scopedSessionIds = this.deps.sessionManager
      .getSessionsByWorkspacePath(ack.workspaceRoot)
      .map((session) => session.id);
    wsManager.populateSessionWorkspaceScope(
      ack.workspaceRoot,
      scopedSessionIds
    );
  }

  handleWorkspaceSnapshotRequest(
    clientId: string,
    payload: Extract<
      IncomingMessage,
      { readonly type: "workspace:snapshot:request" }
    >["payload"]
  ): void {
    const scopedManager = this.deps.getManager();
    if (!scopedManager) {
      return;
    }
    const scope = scopedManager.getWorkspaceScope(clientId);
    if (
      scope?.enabled &&
      scope.workspacePath &&
      payload.workspaceRoot !== scope.workspacePath
    ) {
      this.deps.sendScopeViolation(
        clientId,
        "workspace:snapshot:request",
        "workspace:snapshot:request rejected for out-of-scope workspace"
      );
      return;
    }
    const message = this.deps.workspaceRuntime.requestSnapshot(clientId);
    if (!message) {
      this.deps.sendScopeViolation(
        clientId,
        "workspace:snapshot:request",
        "No active workspace selection"
      );
      return;
    }
    scopedManager.sendToClient(clientId, message);
  }
}
