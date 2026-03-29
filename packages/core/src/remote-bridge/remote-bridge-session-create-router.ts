import type { Logger } from "../telemetry/logger";
import type { WorkflowRuntime } from "../workflow/runtime/workflow-runtime";
import type { SessionRequestHandler } from "./handlers/session-request-handler";
import type { WebSocketManager } from "./handlers/websocket-manager";
import type { IncomingMessage } from "./types";

interface RemoteBridgeSessionCreateRouterDependencies {
  readonly getManager: () => WebSocketManager | undefined;
  readonly logger: Logger;
  readonly sessionHandler: SessionRequestHandler;
  readonly workflowRuntime: WorkflowRuntime;
}

export class RemoteBridgeSessionCreateRouter {
  private readonly deps: RemoteBridgeSessionCreateRouterDependencies;

  constructor(deps: RemoteBridgeSessionCreateRouterDependencies) {
    this.deps = deps;
  }

  async handle(
    clientId: string,
    incoming: Extract<IncomingMessage, { readonly type: "session:create" }>
  ): Promise<void> {
    const resolvedWorkspacePath =
      incoming.payload?.workspacePath ??
      this.deps.getManager()?.getWorkspaceScope(clientId)?.workspacePath ??
      undefined;
    const initiativeSlug = incoming.payload?.initiativeSlug ?? null;

    await this.deps.sessionHandler.handleCreate(
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
      await this.deps.workflowRuntime.connectWorkspace({
        workspaceRoot: resolvedWorkspacePath,
        workspaceSlug: initiativeSlug,
      });
    } catch (error: unknown) {
      this.deps.logger.warn(
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
