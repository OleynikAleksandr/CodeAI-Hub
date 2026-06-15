import type { ProviderStackDescriptor } from "../../types/provider";
import {
  extractProviders,
  resolveDescriptionProviders,
  type ProviderSnapshot,
} from "./services/provider-snapshot";
import { resolveBridgeConfig, type ApiConfig } from "./services/bridge-config";
import {
  fetchWorkflowState,
  type WorkflowStateSnapshot,
} from "./services/workflow-state-client";
import type { WorkspaceSettingsScopePayload } from "./services/project-manager-settings-client";
import type {
  CoreStatePayload,
  IncomingMessage,
  ProjectManagerDiagnosticLogPayload,
  ProjectUpdatePayload,
  SettingsLoadedPayload,
  SettingsLocalizationSyncStatusPayload,
  SettingsNativeRequestCaptureOptions,
  SettingsNativeRequestCaptureModelId,
  SettingsNativeRequestCaptureProviderId,
  SettingsProviderTarget,
  SettingsSaveErrorPayload,
  SettingsTemplateUpdateResolutionAction,
  SettingsUserGlossaryFilePayload,
  SettingsVersionsPayload,
  WorkspaceSelectPayload,
  WorkspaceSnapshotRequestPayload,
} from "./core-stream-message-types";
import { type QueuedOutgoingMessage, OutgoingMessageQueue } from "./services/outgoing-message-queue";
import { SwitchApi } from "./services/switch-api";
import type {
  ClaudeThinkingEffort,
  CodexModelSwitchReasoningEffort,
} from "./services/switch-payloads";
import type { WorkspaceProject } from "./types";
import {
  resolveLauncherBridge,
  resolveVscodeBridge,
} from "./services/pm-bridges";
import { createDialogApi, type DialogApi } from "./services/dialog-api";
import { parseCoreStreamMessage } from "./services/core-stream-message-validator";
import { ProjectManagerCoreRestartTracker } from "./services/project-manager-core-restart-tracker";
import {
  createProjectManagerWindowMessageHandler,
  ProjectManagerSocketLifecycle,
} from "./services/project-manager-api-lifecycle";
import type { WorkbenchOutgoingMessage } from "./services/workbench-bridge-types";

type ProjectListener = (projects: readonly WorkspaceProject[]) => void;
type CoreEventListener = (message: IncomingMessage) => void;
type ProjectManagerWindow = typeof window & {
  __CODEAI_PM_STOP_SESSION__?: (sessionId: string) => void;
};

const vscode = resolveVscodeBridge();

class ProjectManagerApi {
  private readonly listeners = new Set<ProjectListener>();
  private readonly coreListeners = new Set<CoreEventListener>();
  private lastSettingsPayload: SettingsLoadedPayload | null = null;
  private lastSettingsSaveError: string | null = null;
  private lastSettingsVersionsPayload: SettingsVersionsPayload | null = null;
  private lastUserGlossaryFilePayload: SettingsUserGlossaryFilePayload | null =
    null;
  private localizationSyncStatus: SettingsLocalizationSyncStatusPayload = {
    busy: false,
    message: null,
  };
  private providerSnapshot: ProviderSnapshot[] = [];
  private readonly outgoingQueue = new OutgoingMessageQueue();
  private readonly switchApi = new SwitchApi((message) => this.send(message));
  private readonly coreRestartTracker = new ProjectManagerCoreRestartTracker(
    (message) => this.notifyCoreListeners(message)
  );
  private readonly socketLifecycle: ProjectManagerSocketLifecycle;
  private windowMessageListenerAttached = false;
  private readonly config: ApiConfig;
  private readonly windowMessageHandler =
    createProjectManagerWindowMessageHandler({
      addProject: (path) => this.addProject(path),
      notifyCoreListeners: (message) => this.notifyCoreListeners(message),
      setLocalizationSyncStatus: (payload) =>
        this.setLocalizationSyncStatus(payload),
    });
  readonly dialogs: DialogApi;

  constructor() {
    this.config = resolveBridgeConfig();
    this.socketLifecycle = new ProjectManagerSocketLifecycle({
      onClose: () => this.handleSocketClose(),
      onError: (error) => console.error("[ProjectManagerApi] Socket error", error),
      onMessage: (data) => this.handleSocketMessage(data),
      onOpen: () => this.handleSocketOpen(),
      streamUrl: `${this.config.wsUrl}/api/v1/stream`,
    });
    (window as ProjectManagerWindow).__CODEAI_PM_STOP_SESSION__ = (
      sessionId: string
    ) => {
      this.stopSession(sessionId);
    };

    this.dialogs = createDialogApi((message) => this.send(message));
  }

  connect(): void {
    this.attachWindowMessageListener();
    this.socketLifecycle.connect();
  }

  disconnect(options: { readonly dispose?: boolean } = {}): void {
    this.socketLifecycle.disconnect();
    if (options.dispose) {
      this.detachWindowMessageListener();
    }
  }

  pickFolder(): boolean {
    if (vscode?.postMessage) {
      vscode.postMessage({ type: "projects:pickFolder" });
      return true;
    }
    const launcher = resolveLauncherBridge();
    if (launcher) {
      return launcher.pickFolder();
    }
    console.warn("[ProjectManagerApi] No folder picker available.");
    return false;
  }

  listProjects(): void { this.send({ type: "projects:list" }); }
  loadSettings(scope?: WorkspaceSettingsScopePayload): void {
    if (!(scope?.workspacePath && scope.workspaceSlug)) return;
    this.send({ type: "settings:load", payload: scope } as QueuedOutgoingMessage);
  }
  loadSettingsVersions(): void { this.send({ type: "settings:versions" }); }
  getLastSettingsPayload(): SettingsLoadedPayload | null { return this.lastSettingsPayload; }
  getLastSettingsSaveError(): string | null { return this.lastSettingsSaveError; }
  getLastSettingsVersionsPayload(): SettingsVersionsPayload | null { return this.lastSettingsVersionsPayload; }
  getLastUserGlossaryFilePayload(): SettingsUserGlossaryFilePayload | null { return this.lastUserGlossaryFilePayload; }

  saveSettings(settings: unknown, scope?: WorkspaceSettingsScopePayload): void {
    this.lastSettingsSaveError = null;
    this.send({ type: "settings:save", payload: { ...scope, settings } } as QueuedOutgoingMessage);
  }
  resetSettings(scope?: WorkspaceSettingsScopePayload): void { this.lastSettingsSaveError = null; this.send({ type: "settings:reset", payload: scope } as QueuedOutgoingMessage); }
  restartCore(): void {
    this.coreRestartTracker.requestRestart();
  }

  updateSettingsProvider(
    provider: "claude" | "codex" | "gemini",
    target: SettingsProviderTarget
  ): void {
    this.send({
      type: "settings:update-provider",
      payload: { provider, target },
    });
  }
  openUserGlossaryFile(): void {
    this.lastUserGlossaryFilePayload = null;
    const settingsScope = this.lastSettingsPayload as WorkspaceSettingsScopePayload | null;
    const payload = settingsScope?.workspacePath && settingsScope.workspaceSlug ? { workspacePath: settingsScope.workspacePath, workspaceSlug: settingsScope.workspaceSlug } : undefined;
    this.send({ type: "settings:open-user-glossary-file", payload } as QueuedOutgoingMessage);
  }
  loadTemplateUpdates(): void {
    this.send({ type: "settings:template-updates" });
  }

  resolveTemplateUpdate(
    id: string,
    action: SettingsTemplateUpdateResolutionAction
  ): void {
    this.send({ type: "settings:template-update:resolve", payload: { id, action } });
  }

  captureNativeRequest(
    providerId: SettingsNativeRequestCaptureProviderId,
    modelId?: SettingsNativeRequestCaptureModelId,
    options?: SettingsNativeRequestCaptureOptions
  ): void {
    this.send({ type: "settings:native-request-capture", payload: { ...options, modelId, providerId } });
  }

  addProject(path: string, name?: string): void {
    this.send({ type: "projects:add", payload: { path, name } });
  }

  removeProject(id: string): void {
    this.send({ type: "projects:remove", payload: { id } });
  }

  selectWorkspace(payload: WorkspaceSelectPayload): void {
    this.send({ type: "workspace:select", payload });
  }

  requestWorkspaceSnapshot(payload: WorkspaceSnapshotRequestPayload): void {
    this.send({ type: "workspace:snapshot:request", payload });
  }

  createSession(params: {
    readonly providerId?: string;
    readonly workspacePath?: string;
    readonly initiativeSlug?: string | null;
    readonly providerSessionId?: string | null;
    readonly stage?: string | null;
    readonly sessionKind?: "collector" | null;
    readonly runSlug?: string | null;
  }): void {
    if (this.localizationSyncStatus.busy) {
      console.warn(
        "[ProjectManagerApi] Session creation blocked by localization sync",
        this.localizationSyncStatus
      );
      return;
    }
    this.send({ type: "session:create", payload: params });
  }
  startDevelopmentTreeNode(params: {
    readonly modelId?: string | null;
    readonly providerId: string;
    readonly reasoning?: string | null;
    readonly workflowPath: string;
    readonly workspacePath: string;
    readonly workspaceSlug: string;
  }): void {
    this.send({ type: "development-tree:node-start", payload: params } as unknown as QueuedOutgoingMessage);
  }
  deleteSession(sessionId: string): void {
    this.send({ type: "session:delete", payload: { sessionId } });
  }

  stopSession(sessionId: string): void {
    this.send({ type: "session:stop", payload: { sessionId } });
  }

  requestCodexModelSwitch(sessionId: string, targetModelId: string): void {
    this.switchApi.requestCodexModelSwitch(sessionId, targetModelId);
  }
  requestLocalModelsModelSwitch(sessionId: string, targetModelId: string): void { this.switchApi.requestLocalModelsModelSwitch(sessionId, targetModelId); }
  requestCodexReasoningSwitch(
    sessionId: string,
    targetReasoningEffort: CodexModelSwitchReasoningEffort
  ): void {
    this.switchApi.requestCodexReasoningSwitch(sessionId, targetReasoningEffort);
  }
  requestClaudeModelSwitch(sessionId: string, targetModelId: "sonnet" | "opus" | "haiku"): void {
    this.switchApi.requestClaudeModelSwitch(sessionId, targetModelId);
  }
  requestClaudeThinkingSwitch(
    sessionId: string,
    thinkingEnabled: boolean,
    targetReasoningEffort?: ClaudeThinkingEffort
  ): void {
    this.switchApi.requestClaudeThinkingSwitch(
      sessionId,
      thinkingEnabled,
      targetReasoningEffort
    );
  }

  refreshUsageLimits(params: {
    readonly lifecycleTrigger?:
      | "binding_ready"
      | "dialog_opened"
      | "manual"
      | "provider_session_rebound"
      | "reconnect"
      | "session_opened"
      | "turn_completed";
    readonly providerId: string;
    readonly providerSessionId: string | null;
    readonly sessionId: string;
  }): void {
    this.logDiagnostic({
      channel: "usage-limits",
      event: "pm.refreshUsageLimits.requested",
      context: params,
    });
    this.send({
      type: "session:refreshUsageLimits",
      payload: params,
    });
  }

  logDiagnostic(payload: ProjectManagerDiagnosticLogPayload): void {
    this.send({
      type: "pm:diag:log",
      payload,
    });
  }
  sendWorkbenchMessage(message: WorkbenchOutgoingMessage): void { this.send(message); }

  sendSessionMessage(
    sessionId: string,
    content: string,
    turnOptions?: Record<string, unknown>
  ): void {
    if (!content.trim()) {
      return;
    }
    if (this.localizationSyncStatus.busy) {
      console.warn(
        "[ProjectManagerApi] Session message blocked by localization sync",
        {
          sessionId,
          localizationSyncStatus: this.localizationSyncStatus,
        }
      );
      return;
    }
    const payloadContent = turnOptions
      ? { text: content, turnOptions }
      : content;
    this.send({
      type: "session:message",
      payload: { sessionId, content: payloadContent },
    });
  }

  onProjectsUpdate(listener: ProjectListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  onCoreEvent(listener: CoreEventListener): () => void {
    this.coreListeners.add(listener);
    return () => {
      this.coreListeners.delete(listener);
    };
  }

  getDescriptionProviders(): readonly ProviderStackDescriptor[] {
    return resolveDescriptionProviders(this.providerSnapshot);
  }

  getHttpUrl(): string | null {
    return typeof this.config.httpUrl === "string" ? this.config.httpUrl : null;
  }

  getWsStreamUrl(): string {
    const wsUrl =
      typeof this.config.wsUrl === "string"
        ? this.config.wsUrl
        : "ws://127.0.0.1:8080";
    return `${wsUrl}/api/v1/stream`;
  }

  getLocalizationSyncStatus(): SettingsLocalizationSyncStatusPayload {
    return this.localizationSyncStatus;
  }

  async getWorkflowState(
    workspaceSlug: string,
    workspacePath?: string
  ): Promise<WorkflowStateSnapshot | null> {
    const httpUrl = this.getHttpUrl();
    if (!httpUrl) {
      return null;
    }
    return fetchWorkflowState({ httpUrl, workspaceSlug, workspacePath });
  }

  private send(message: QueuedOutgoingMessage): void {
    if (this.socketLifecycle.send(JSON.stringify(message))) {
      return;
    }
    this.outgoingQueue.enqueue(message);
    console.warn("[ProjectManagerApi] Socket not ready, message queued", message);
  }

  private handleMessage(message: IncomingMessage): void {
    this.coreRestartTracker.handleIncomingMessage(message);
    if (message.type === "projects:update") {
      const payload = message.payload as ProjectUpdatePayload;
      if (payload?.projects) {
        this.notifyListeners(payload.projects);
      }
    }
    if (message.type === "core:state") {
      const payload = message.payload as CoreStatePayload;
      const providers = extractProviders(payload);
      if (providers.length > 0) {
        this.providerSnapshot = providers;
      }
    }
    this.cacheSettingsMessage(message);
    this.notifyCoreListeners(message);
  }

  private cacheSettingsMessage(message: IncomingMessage): void {
    switch (message.type) {
      case "settings:loaded": {
        this.lastSettingsPayload = message.payload as SettingsLoadedPayload;
        this.lastSettingsSaveError = null;
        return;
      }
      case "settings:saved": {
        this.lastSettingsPayload = {
          ...(message.payload as SettingsLoadedPayload),
          error: null,
        };
        this.lastSettingsSaveError = null;
        return;
      }
      case "settings:save-error": {
        const payload = message.payload as SettingsSaveErrorPayload;
        this.lastSettingsSaveError = payload.error;
        return;
      }
      case "settings:localization-sync-status": {
        this.setLocalizationSyncStatus(
          message.payload as SettingsLocalizationSyncStatusPayload
        );
        return;
      }
      case "settings:versions": {
        this.lastSettingsVersionsPayload =
          message.payload as SettingsVersionsPayload;
        return;
      }
      case "settings:user-glossary-file": {
        this.lastUserGlossaryFilePayload =
          message.payload as SettingsUserGlossaryFilePayload;
        return;
      }
      default: {
        return;
      }
    }
  }

  private notifyListeners(projects: readonly WorkspaceProject[]): void {
    for (const listener of this.listeners) {
      listener(projects);
    }
  }

  private notifyCoreListeners(message: IncomingMessage): void {
    for (const listener of this.coreListeners) {
      listener(message);
    }
  }

  private setLocalizationSyncStatus(
    payload: SettingsLocalizationSyncStatusPayload
  ): void {
    this.localizationSyncStatus = payload;
  }

  private attachWindowMessageListener(): void {
    if (this.windowMessageListenerAttached) {
      return;
    }
    window.addEventListener("message", this.windowMessageHandler);
    this.windowMessageListenerAttached = true;
  }

  private detachWindowMessageListener(): void {
    if (!this.windowMessageListenerAttached) {
      return;
    }
    window.removeEventListener("message", this.windowMessageHandler);
    this.windowMessageListenerAttached = false;
  }

  private handleSocketClose(): void {
    this.coreRestartTracker.handleSocketClose();
  }

  private handleSocketMessage(data: string): void {
    const result = parseCoreStreamMessage(data);
    if (!result.ok) {
      console.warn("[ProjectManagerApi] Dropped invalid Core stream message", {
        error: result.error,
        reason: result.reason,
      });
      return;
    }
    this.handleMessage(result.message);
  }

  private handleSocketOpen(): void {
    this.coreRestartTracker.handleSocketOpen();
    this.outgoingQueue.flush((message) => {
      if (!this.socketLifecycle.send(JSON.stringify(message))) {
        throw new Error("Socket not ready");
      }
    });
    this.listProjects();
  }
}

export const api = new ProjectManagerApi();
