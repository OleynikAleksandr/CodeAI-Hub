import { randomUUID } from "node:crypto";
import {
  isNativeRequestCaptureProviderId,
  type NativeRequestCaptureFacade,
} from "../provider-network-capture/native-request-capture-facade";
import type { NativeRequestCaptureMode } from "../provider-network-capture/native-request-capture-types";
import type { SessionRequestHandler } from "./handlers/session-request-handler";
import { RemoteBridgeDevelopmentTreeNodeCommandRouter } from "./remote-bridge-development-tree-node-command-router";
import { RemoteBridgeDialogCommandRouter } from "./remote-bridge-dialog-command-router";
import type { RemoteBridgeMessageRouterDependencies } from "./remote-bridge-message-router-dependencies";
import { RemoteBridgeSessionCreateRouter } from "./remote-bridge-session-create-router";
import { validateSessionScopedMessageWorkspace } from "./remote-bridge-session-scope-validator";
import { RemoteBridgeWorkbenchCommandRouter } from "./remote-bridge-workbench-command-router";
import { RemoteBridgeWorkspaceCommandRouter } from "./remote-bridge-workspace-command-router";
import type { IncomingMessage } from "./types";

type SettingsWorkspaceScopePayload = Readonly<{
  workspacePath?: string | null;
  workspaceSlug?: string | null;
}>;
export class RemoteBridgeMessageRouter {
  private readonly deps: RemoteBridgeMessageRouterDependencies;
  private readonly developmentTreeNodeCommandRouter: RemoteBridgeDevelopmentTreeNodeCommandRouter;
  private readonly dialogCommandRouter: RemoteBridgeDialogCommandRouter;
  private readonly sessionCreateRouter: RemoteBridgeSessionCreateRouter;
  private readonly workbenchCommandRouter: RemoteBridgeWorkbenchCommandRouter;
  private readonly workspaceCommandRouter: RemoteBridgeWorkspaceCommandRouter;
  constructor(deps: RemoteBridgeMessageRouterDependencies) {
    this.deps = deps;
    this.dialogCommandRouter = new RemoteBridgeDialogCommandRouter({
      dialogHistoryService: deps.dialogHistoryService,
      dialogListService: deps.dialogListService,
      dialogOpenService: deps.dialogOpenService,
      getManager: deps.getManager,
      providerBindingService: deps.sessionHandler.getProviderBindingService(),
      sendScopeViolation: (clientId, command, message) =>
        this.sendScopeViolation(clientId, command, message),
      sessionHandler: deps.sessionHandler,
      sessionManager: deps.sessionManager,
      workspaceRuntime: deps.workspaceRuntime,
    });
    this.sessionCreateRouter = new RemoteBridgeSessionCreateRouter({
      getManager: deps.getManager,
      logger: deps.logger,
      sessionHandler: deps.sessionHandler,
      workflowRuntime: deps.workflowRuntime,
    });
    this.developmentTreeNodeCommandRouter =
      new RemoteBridgeDevelopmentTreeNodeCommandRouter({
        sessionHandler: deps.sessionHandler,
        sessionCreateRouter: this.sessionCreateRouter,
        sendCommandError: (clientId, command, message, code) =>
          this.sendCommandError(clientId, command, message, code),
      });
    this.workbenchCommandRouter = new RemoteBridgeWorkbenchCommandRouter({
      getManager: deps.getManager,
    });
    this.workspaceCommandRouter = new RemoteBridgeWorkspaceCommandRouter({
      getManager: deps.getManager,
      sendScopeViolation: (clientId, command, message) =>
        this.sendScopeViolation(clientId, command, message),
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
      case "pm:diag:log":
        this.deps.logger.info("Project Manager diagnostic log", {
          channel: incoming.payload.channel,
          clientId,
          event: incoming.payload.event,
          ...(incoming.payload.context
            ? { context: incoming.payload.context }
            : {}),
        });
        break;
      case "session:create":
        await this.sessionCreateRouter.handle(clientId, incoming);
        break;
      case "settings:load":
        await this.deps.settingsHandler.handleLoad(
          RemoteBridgeMessageRouter.resolveSettingsWorkspace(
            "payload" in incoming ? incoming.payload : undefined
          )
        );
        break;
      case "settings:versions":
        await this.deps.settingsHandler.handleLoadVersions();
        break;
      case "settings:save":
        await this.deps.settingsHandler.handleSave(
          incoming.payload.settings,
          RemoteBridgeMessageRouter.resolveSettingsWorkspace(incoming.payload)
        );
        break;
      case "settings:reset":
        await this.deps.settingsHandler.handleReset(
          RemoteBridgeMessageRouter.resolveSettingsWorkspace(
            "payload" in incoming ? incoming.payload : undefined
          )
        );
        break;
      case "settings:update-provider":
        await this.deps.settingsHandler.handleUpdateProvider(
          incoming.payload.provider,
          incoming.payload.target
        );
        break;
      case "settings:open-user-glossary-file":
        await this.deps.settingsHandler.handleOpenUserGlossaryFile(
          RemoteBridgeMessageRouter.resolveSettingsWorkspace(
            "payload" in incoming ? incoming.payload : undefined
          )
        );
        break;
      case "settings:template-updates":
        await this.deps.settingsHandler.handleListTemplateUpdates();
        break;
      case "settings:template-update:resolve":
        await this.deps.settingsHandler.handleResolveTemplateUpdate(
          incoming.payload
        );
        break;
      case "settings:native-request-capture":
        await this.handleNativeRequestCapture(clientId, incoming.payload);
        break;
      case "development-tree:node-start":
        await this.developmentTreeNodeCommandRouter.handle(
          clientId,
          incoming.payload
        );
        break;
      case "workbench:state:load":
        await this.workbenchCommandRouter.handleStateLoad(
          clientId,
          incoming.payload
        );
        break;
      case "workbench:state:save":
        await this.workbenchCommandRouter.handleStateSave(
          clientId,
          incoming.payload
        );
        break;
      case "workbench:artifact:read":
        await this.workbenchCommandRouter.handleArtifactRead(
          clientId,
          incoming.payload
        );
        break;
      case "session:message":
        await this.deps.sessionHandler.handleMessage(
          incoming.payload.sessionId,
          incoming.payload.content
        );
        break;
      case "session:codex:model-switch":
        await this.deps.sessionHandler.handleCodexModelSwitch(incoming.payload);
        break;
      case "session:codex:reasoning-switch":
        await this.deps.sessionHandler.handleCodexReasoningSwitch(
          incoming.payload
        );
        break;
      case "session:claude:model-switch":
        await this.deps.sessionHandler.handleClaudeModelSwitch(
          incoming.payload
        );
        break;
      case "session:claude:thinking-switch":
        await this.deps.sessionHandler.handleClaudeThinkingSwitch(
          incoming.payload
        );
        break;
      case "session:local-models:model-switch":
        await this.deps.sessionHandler.handleLocalModelsModelSwitch(
          incoming.payload
        );
        break;
      case "session:delete":
        await this.deps.sessionHandler.handleDelete(incoming.payload.sessionId);
        break;
      case "session:stop":
        await this.handleSessionStopMessage(incoming.payload);
        break;
      case "session:speech:speak-message":
        this.deps.sessionSpeechHandler?.handleSpeakMessage(incoming.payload);
        break;
      case "session:speech:stop":
        this.deps.sessionSpeechHandler?.handleStop(incoming.payload);
        break;
      case "session:refreshUsageLimits": {
        const refreshPayload = incoming.payload as typeof incoming.payload & {
          readonly lifecycleTrigger?:
            | "binding_ready"
            | "dialog_opened"
            | "manual"
            | "provider_session_rebound"
            | "reconnect"
            | "session_opened"
            | "turn_completed"
            | null;
        };
        this.deps.sessionHandler
          .handleRefreshUsageLimits(refreshPayload)
          .catch((error: unknown) => {
            this.deps.logger.warn("refreshUsageLimits failed", {
              lifecycleTrigger: refreshPayload.lifecycleTrigger ?? null,
              providerId: refreshPayload.providerId,
              sessionId: refreshPayload.sessionId,
              error: error instanceof Error ? error.message : String(error),
            });
          });
        break;
      }
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
  private static resolveSettingsWorkspace(
    payload: unknown
  ):
    | { readonly workspaceRoot: string; readonly workspaceSlug: string }
    | undefined {
    if (!(payload && typeof payload === "object")) {
      return undefined;
    }
    const scope = payload as SettingsWorkspaceScopePayload;
    if (!(scope.workspacePath && scope.workspaceSlug)) {
      return undefined;
    }
    return {
      workspaceRoot: scope.workspacePath,
      workspaceSlug: scope.workspaceSlug,
    };
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
    return validateSessionScopedMessageWorkspace({
      clientId,
      incoming,
      sendScopeViolation: (targetClientId, command, message) =>
        this.sendScopeViolation(targetClientId, command, message),
      sessionManager: this.deps.sessionManager,
      workspacePath: scope.workspacePath,
    });
  }

  private async handleSessionStopMessage(payload: {
    readonly sessionId?: unknown;
  }): Promise<void> {
    const sessionId =
      typeof payload.sessionId === "string" ? payload.sessionId : null;
    if (!sessionId) {
      return;
    }
    const stopHandler = this.deps.sessionHandler as SessionRequestHandler & {
      readonly handleStop?: (sessionId: string) => Promise<void>;
    };
    if (typeof stopHandler.handleStop !== "function") {
      this.deps.logger.warn(
        "session:stop transport command received before runtime stop handler is wired",
        { sessionId }
      );
      return;
    }
    await stopHandler.handleStop(sessionId);
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
  private async handleNativeRequestCapture(
    clientId: string,
    payload: {
      readonly captureMode?: unknown;
      readonly modelId?: unknown;
      readonly providerId?: unknown;
      readonly reasoning?: unknown;
      readonly scenarioId?: unknown;
      readonly scenarioInputPath?: unknown;
      readonly scenarioLabel?: unknown;
      readonly scenarioPrompt?: unknown;
      readonly scenarioTargetPath?: unknown;
      readonly workspacePath?: unknown;
    }
  ): Promise<void> {
    const providerId = isNativeRequestCaptureProviderId(payload.providerId)
      ? payload.providerId
      : null;
    if (!providerId) {
      this.sendNativeRequestCaptureResult(clientId, {
        providerId: "claude",
        ok: false,
        markdownPath: null,
        jsonlPath: null,
        modelId: null,
        error: "provider_not_supported",
        reason: "provider_not_supported",
        scenarioId: null,
      });
      return;
    }
    const scope = this.deps.getManager()?.getWorkspaceScope(clientId);
    const workspacePath =
      typeof payload.workspacePath === "string" &&
      payload.workspacePath.trim().length > 0
        ? payload.workspacePath
        : (scope?.workspacePath ?? process.cwd());
    const modelId =
      typeof payload.modelId === "string" && payload.modelId.trim().length > 0
        ? payload.modelId.trim()
        : null;
    const result = await this.deps.nativeRequestCaptureFacade.capture({
      captureMode: readCaptureMode(payload.captureMode),
      modelId,
      providerId,
      reasoning: readOptionalString(payload.reasoning),
      scenarioId: readOptionalString(payload.scenarioId),
      scenarioInputPath: readOptionalString(payload.scenarioInputPath),
      scenarioLabel: readOptionalString(payload.scenarioLabel),
      scenarioPrompt: readOptionalString(payload.scenarioPrompt),
      scenarioTargetPath: readOptionalString(payload.scenarioTargetPath),
      workspacePath,
    });
    this.sendNativeRequestCaptureResult(clientId, result);
  }

  private sendNativeRequestCaptureResult(
    clientId: string,
    payload: Awaited<ReturnType<NativeRequestCaptureFacade["capture"]>>
  ): void {
    this.deps.getManager()?.sendToClient(clientId, {
      type: "settings:native-request-capture:result",
      payload,
    });
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
  private sendCommandError(
    clientId: string,
    command: string,
    message: string,
    code: string
  ): void {
    this.deps.getManager()?.sendToClient(clientId, {
      type: "command:error",
      payload: {
        requestId: randomUUID(),
        command,
        message,
        code,
      },
    });
  }
}
const readOptionalString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

const readCaptureMode = (value: unknown): NativeRequestCaptureMode | null =>
  value === "managed" || value === "vanilla" ? value : null;
