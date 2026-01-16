import type { WorkspaceProject } from "./types";

type ApiConfig = {
  readonly wsUrl: string;
  readonly httpUrl: string;
};

type OutgoingMessage =
  | { readonly type: "projects:list" }
  | {
      readonly type: "projects:add";
      readonly payload: { readonly path: string; readonly name?: string };
    }
  | {
      readonly type: "projects:remove";
      readonly payload: { readonly id: string };
    }
  | {
      readonly type: "session:create";
      readonly payload: {
        readonly providerId?: string;
        readonly workspacePath?: string;
        readonly initiativeSlug?: string | null;
        readonly runSlug?: string | null;
        readonly providerSessionId?: string | null;
        readonly stage?: string | null;
      };
    }
  | {
      readonly type: "session:message";
      readonly payload: {
        readonly sessionId: string;
        readonly content:
          | string
          | { readonly text: string; readonly turnOptions?: Record<string, unknown> };
      };
    }
  | {
      readonly type: "session:delete";
      readonly payload: { readonly sessionId: string };
    };

type IncomingMessage = {
  readonly type: string;
  readonly payload?: unknown;
};

type ProjectUpdatePayload = {
  readonly projects: readonly WorkspaceProject[];
};

type ProjectListener = (projects: readonly WorkspaceProject[]) => void;
type CoreEventListener = (message: IncomingMessage) => void;

type VscodeBridge = {
  postMessage: (message: unknown) => void;
};

const resolveVscodeBridge = (): VscodeBridge | null => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const acquire = (window as any).acquireVsCodeApi;
  if (typeof acquire !== "function") {
    return null;
  }
  try {
    const api = acquire();
    if (api && typeof api.postMessage === "function") {
      return api as VscodeBridge;
    }
  } catch {
    return null;
  }
  return null;
};

const vscode = resolveVscodeBridge();

export class ProjectManagerApi {
  private socket: WebSocket | null = null;
  private readonly listeners = new Set<ProjectListener>();
  private readonly coreListeners = new Set<CoreEventListener>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly config: ApiConfig;

  constructor() {
    // Expect config to be injected by the host environment
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.config = (window as any).codeaiBridgeConfig || {
      wsUrl: "ws://127.0.0.1:8080",
      httpUrl: "http://127.0.0.1:8080",
    };

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
            this.addProject(path);
          }
        }
      }
    });
  }

  connect(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.socket = new WebSocket(`${this.config.wsUrl}/api/v1/stream`);
      this.socket.onopen = () => {
        console.log("[ProjectManagerApi] Connected to Core");
        this.listProjects(); // Initial fetch
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

  pickFolder(): void {
    if (vscode?.postMessage) {
      vscode.postMessage({ type: "projects:pickFolder" });
      return;
    }
    console.warn("[ProjectManagerApi] No folder picker available.");
  }

  listProjects(): void {
    this.send({ type: "projects:list" });
  }

  addProject(path: string, name?: string): void {
    this.send({ type: "projects:add", payload: { path, name } });
  }

  removeProject(id: string): void {
    this.send({ type: "projects:remove", payload: { id } });
  }

  createSession(params: {
    readonly providerId?: string;
    readonly workspacePath?: string;
    readonly initiativeSlug?: string | null;
    readonly runSlug?: string | null;
    readonly providerSessionId?: string | null;
    readonly stage?: string | null;
  }): void {
    this.send({ type: "session:create", payload: params });
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

  private send(message: OutgoingMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    } else {
      console.warn("[ProjectManagerApi] Socket not ready, message dropped", message);
    }
  }

  private handleMessage(message: IncomingMessage): void {
    if (message.type === "projects:update") {
      const payload = message.payload as ProjectUpdatePayload;
      if (payload?.projects) {
        this.notifyListeners(payload.projects);
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
