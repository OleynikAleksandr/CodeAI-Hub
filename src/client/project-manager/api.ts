import type { ProviderStackDescriptor } from "../../types/provider";
import {
  extractProviders,
  resolveIdeaCollectorProviders,
  type ProviderSnapshot,
} from "./services/provider-snapshot";
import { resolveBridgeConfig, type ApiConfig } from "./services/bridge-config";
import {
  fetchWorkflowState,
  type WorkflowStateSnapshot,
} from "./services/workflow-state-client";
import type {
  CoreStatePayload,
  IncomingMessage,
  ProjectUpdatePayload,
  WorkspaceSelectPayload,
  WorkspaceSnapshotRequestPayload,
} from "./core-stream-message-types";
import { OutgoingMessageQueue } from "./services/outgoing-message-queue";
import {
  DialogSendTraceClient,
  isDialogHistoryMessage,
  isDialogSendMessage,
  type ProjectManagerOutboundMessage,
} from "./services/dialog-send-trace-client";
import type { WorkspaceProject } from "./types";
import { resolveLauncherBridge, resolveVscodeBridge } from "./services/pm-bridges";
import { createDialogApi, type DialogApi } from "./services/dialog-api";

type ProjectListener = (projects: readonly WorkspaceProject[]) => void;
type CoreEventListener = (message: IncomingMessage) => void;

const vscode = resolveVscodeBridge();

export class ProjectManagerApi {
  private socket: WebSocket | null = null;
  private readonly listeners = new Set<ProjectListener>();
  private readonly coreListeners = new Set<CoreEventListener>();
  private providerSnapshot: ProviderSnapshot[] = [];
  private readonly outgoingQueue =
    new OutgoingMessageQueue<ProjectManagerOutboundMessage>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly config: ApiConfig;
  private readonly dialogTrace = new DialogSendTraceClient((message) =>
    this.send(message)
  );
  readonly dialogs: DialogApi;

  constructor() {
    this.config = resolveBridgeConfig();

    window.addEventListener("message", (event) => {
      const message = event.data;
      if (
        message &&
        typeof message === "object" &&
        "type" in message &&
        message.type === "projects:folderPicked"
      ) {
        const payload = "payload" in message ? message.payload : null;
        if (payload && typeof payload === "object" && "path" in payload) {
          const path = payload.path;
          if (typeof path === "string") {
            window.dispatchEvent(
              new CustomEvent("pm:workspace:add-requested", {
                detail: { path },
              })
            );
            this.addProject(path);
          }
        }
      }
    });

    this.dialogs = createDialogApi(
      (message) => this.send(message),
      (attempt) => this.dialogTrace.registerSendAttempt(attempt)
    );
  }

  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.socket = new WebSocket(`${this.config.wsUrl}/api/v1/stream`);
      this.socket.onopen = () => {
        console.log("[ProjectManagerApi] Connected to Core");
        this.outgoingQueue.flush((message) => {
          this.sendOverSocket(message);
        });
        this.listProjects(); // Initial fetch
        this.loadSettings();
      };
      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as IncomingMessage;
          this.handleMessage(message);
        } catch (error) {
          console.error("[ProjectManagerApi] Failed to parse message", error);
        }
      };
      this.socket.onclose = () => {
        console.log("[ProjectManagerApi] Disconnected. Reconnecting...");
        this.scheduleReconnect();
      };
      this.socket.onerror = (error) => {
        console.error("[ProjectManagerApi] Socket error", error);
      };
    } catch (error) {
      console.error("[ProjectManagerApi] Connection failed", error);
      this.scheduleReconnect();
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

  listProjects(): void {
    this.send({ type: "projects:list" });
  }

  loadSettings(): void {
    this.send({ type: "settings:load" });
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
    this.send({ type: "session:create", payload: params });
  }
  deleteSession(sessionId: string): void {
    this.send({ type: "session:delete", payload: { sessionId } });
  }

  sendSessionMessage(
    sessionId: string,
    content: string,
    turnOptions?: Record<string, unknown>
  ): void {
    if (!content.trim()) {
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

  getIdeaCollectorProviders(): readonly ProviderStackDescriptor[] {
    return resolveIdeaCollectorProviders(this.providerSnapshot);
  }

  getHttpUrl(): string | null {
    return typeof this.config.httpUrl === "string" ? this.config.httpUrl : null;
  }

  getWsUrl(): string | null {
    return typeof this.config.wsUrl === "string" ? this.config.wsUrl : null;
  }

  getWsStreamUrl(): string {
    const wsUrl = this.getWsUrl() ?? "ws://127.0.0.1:8080";
    return `${wsUrl}/api/v1/stream`;
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

  private send(message: ProjectManagerOutboundMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.sendOverSocket(message);
    } else {
      // PM may call into the API before the WS is fully connected (e.g. during
      // cold start after Core restart). Queue messages so scope selection and
      // restore flows don't silently drop and break the UI.
      this.outgoingQueue.enqueue(message);
      console.warn(
        "[ProjectManagerApi] Socket not ready, message queued",
        message
      );
    }
  }

  private handleMessage(message: IncomingMessage): void {
    this.dialogTrace.handleIncomingMessage(message);
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
    this.notifyCoreListeners(message);
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

  private sendOverSocket(message: ProjectManagerOutboundMessage): void {
    if (this.socket?.readyState !== WebSocket.OPEN) {
      throw new Error("Socket not ready");
    }
    if (isDialogSendMessage(message)) {
      this.dialogTrace.traceDialogSendDispatch(message);
    } else if (isDialogHistoryMessage(message)) {
      this.dialogTrace.traceDialogHistoryDispatch(message);
    }
    this.socket.send(JSON.stringify(message));
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      return;
    }
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2000);
  }
}

export const api = new ProjectManagerApi();
