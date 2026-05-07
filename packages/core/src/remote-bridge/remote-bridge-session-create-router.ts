import type { Logger } from "../telemetry/logger";
import type { WorkflowRuntime } from "../workflow/runtime/workflow-runtime";
import type { SessionRequestHandler } from "./handlers/session-request-handler";
import {
  DefaultManagedWorkspaceLifecycle,
  type ManagedWorkspaceLifecycle,
  requiresManagedWorkspaceLifecycle,
} from "./handlers/session-request-handler-workflow-session";
import type { WebSocketManager } from "./handlers/websocket-manager";
import { prepareWorkflowStageDirectories } from "./handlers/workspace-session-service";
import type { IncomingMessage } from "./types";

interface RemoteBridgeSessionCreateRouterDependencies {
  readonly getManager: () => WebSocketManager | undefined;
  readonly logger: Logger;
  readonly managedWorkspaceLifecycle?: ManagedWorkspaceLifecycle;
  readonly sessionHandler: SessionRequestHandler;
  readonly workflowRuntime: WorkflowRuntime;
}

export class RemoteBridgeSessionCreateRouter {
  private readonly deps: RemoteBridgeSessionCreateRouterDependencies;
  private readonly managedWorkspaceLifecycle: ManagedWorkspaceLifecycle;

  constructor(deps: RemoteBridgeSessionCreateRouterDependencies) {
    this.deps = deps;
    this.managedWorkspaceLifecycle =
      deps.managedWorkspaceLifecycle ?? new DefaultManagedWorkspaceLifecycle();
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
    const requestedProviderId =
      incoming.payload?.providerId ??
      incoming.payload?.modelSelection?.providerId ??
      undefined;
    const targetModelId =
      incoming.payload?.targetModelId ??
      incoming.payload?.modelSelection?.modelId ??
      null;
    const createContext = {
      initiativeSlug,
      providerSessionId: incoming.payload?.providerSessionId ?? null,
      stage: incoming.payload?.stage ?? null,
      runSlug: incoming.payload?.runSlug ?? null,
      targetModelId,
    };

    if (!(resolvedWorkspacePath && initiativeSlug)) {
      await this.deps.sessionHandler.handleCreate(
        requestedProviderId,
        resolvedWorkspacePath,
        createContext
      );
      return;
    }

    try {
      await prepareWorkflowStageDirectories({
        initiativeSlug,
        runSlug: createContext.runSlug,
        stage: createContext.stage,
        workspacePath: resolvedWorkspacePath,
      });
      if (
        createContext.stage &&
        requiresManagedWorkspaceLifecycle(createContext.stage)
      ) {
        const managedWorkspace =
          await this.managedWorkspaceLifecycle.ensureReady(
            resolvedWorkspacePath
          );
        if (!managedWorkspace.ok) {
          this.deps.logger.warn(
            "Session create blocked: managed workspace baseline invalid",
            {
              issues: managedWorkspace.issues,
              stage: createContext.stage,
              workspaceRoot: managedWorkspace.workspaceRoot,
            }
          );
          return;
        }
      }
    } catch (error: unknown) {
      this.deps.logger.warn("Failed to prepare workflow stage directories", {
        workspacePath: resolvedWorkspacePath,
        workspaceSlug: initiativeSlug,
        stage: createContext.stage,
        error: error instanceof Error ? error.message : String(error),
      });
      return;
    }

    await this.deps.sessionHandler.handleCreate(
      requestedProviderId,
      resolvedWorkspacePath,
      createContext
    );

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
